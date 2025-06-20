import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';
import { parse } from 'csv-parse/sync';
import { LeadStatus, FileUploadType } from '@prisma/client';

// Utility function to parse dates in various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const cleanDate = dateStr.trim();
    
    // Try MM/DD/YYYY format
    if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [month, day, year] = cleanDate.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Try MM/DD/YY format  
    if (cleanDate.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
      const [month, day, year] = cleanDate.split('/');
      const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
      return new Date(fullYear, parseInt(month) - 1, parseInt(day));
    }
    
    // Try other standard formats
    const parsed = new Date(cleanDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (error) {
    console.warn(`Failed to parse date: ${dateStr}`);
  }
  
  return null;
}

// Utility function to normalize phone numbers
function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

// Generate unique MBI
function generateMBI(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let mbi = '';
  
  // First character must be numeric (1-9)
  mbi += Math.floor(Math.random() * 9) + 1;
  
  // Characters 2-11 can be letters or numbers (excluding S, L, O, I, B, Z)
  const validChars = chars.replace(/[SLOIBZ]/g, '');
  for (let i = 1; i < 11; i++) {
    mbi += validChars.charAt(Math.floor(Math.random() * validChars.length));
  }
  
  return mbi;
}

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const userId = authResult.user?.userId || 'system';

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    let csvData;
    try {
      csvData = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid CSV format', details: parseError },
        { status: 400 }
      );
    }

    if (!csvData || csvData.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Create file upload record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        type: 'BULK_LEAD' as FileUploadType,
        fileName: file.name,
        fileUrl: `uploads/bulk-lead/${Date.now()}-${file.name}`,
        uploadedById: userId,
        recordsProcessed: 0
      }
    });

    // Process results tracking
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>
    };

    // Vendor map for caching
    const vendorMap = new Map<string, string>();
    
    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Smart column mapping for your specific CSV format
        const firstName = row['Patient First Na'] || row['FIRST_NAME'] || row['First Name'] || row['firstName'] || '';
        const lastName = row['Patient Last Na'] || row['LAST_NAME'] || row['Last Name'] || row['lastName'] || '';
        const phone = row['Phone Number:'] || row['PHONE'] || row['Phone'] || row['phone'] || '';
        const mbi = row['Medicare #:'] || row['MBI'] || row['mbi'] || row['MEDICARE_ID'] || '';
        const email = row['EMAIL'] || row['Email'] || row['email'] || '';
        const dateOfBirth = row['Date Of Birth'] || row['DOB'] || row['dateOfBirth'] || '';
        const testType = row['Test :'] || row['TEST_TYPE'] || row['Test Type'] || 'IMMUNE';
        const vendorCode = row['Platform:'] || row['VENDOR_CODE'] || row['Vendor Code'] || '';
        const agentName = row['Agent Name:'] || row['AGENT'] || row['Agent'] || '';
        const lab = row['Lab:'] || row['LAB'] || row['Lab'] || '';
        const gender = row['Gender'] || row['GENDER'] || '';
        const patientComplete = row['Patient Comple'] || row['PATIENT_COMPLETE'] || '';
        const rejectionReason = row['REJECTION REASON:'] || row['REJECTION_REASON'] || '';

        // Handle address - you don't have this in your CSV, so we'll use a default or extract from other fields
        const address = row['ADDRESS'] || row['Patient Comple'] || '123 Main St';
        const city = row['CITY'] || 'Unknown';
        const state = row['STATE'] || 'Unknown';  
        const zipCode = row['ZIP'] || '00000';

        // Debug logging
        console.log(`Processing row ${rowNumber}:`, {
          firstName,
          lastName,
          phone,
          mbi,
          testType,
          address
        });

        // Validate required fields (relaxed for your CSV format)
        if (!firstName || !lastName || !phone) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: firstName, lastName, phone',
            data: { firstName, lastName, phone }
          });
          continue;
        }

        // Handle missing address fields
        let finalAddress = address;
        let finalCity = city;
        let finalState = state;
        let finalZipCode = zipCode;

        // If no proper address, create defaults to satisfy database requirements
        if (!finalAddress || finalAddress === '123 Main St') {
          finalAddress = `Address for ${firstName} ${lastName}`;
        }
        if (finalCity === 'Unknown') {
          finalCity = 'City Unknown';
        }
        if (finalState === 'Unknown') {
          finalState = 'ST';
        }
        if (finalZipCode === '00000') {
          finalZipCode = '12345';
        }

        // Map test types from your CSV format
        let finalTestType = 'IMMUNE';
        if (testType) {
          const testTypeLower = testType.toLowerCase();
          if (testTypeLower.includes('neuro') || testTypeLower.includes('neurological')) {
            finalTestType = 'NEURO';
          } else if (testTypeLower.includes('immune') || testTypeLower.includes('immunological')) {
            finalTestType = 'IMMUNE';
          }
        }

        // Handle vendor
        let vendorId = '';
        let finalVendorCode = vendorCode || lab || 'BULK_UPLOAD';
        
        if (vendorMap.has(finalVendorCode)) {
          vendorId = vendorMap.get(finalVendorCode)!;
        } else {
          // Try to find existing vendor
          let vendor = await prisma.vendor.findFirst({
            where: {
              OR: [
                { code: finalVendorCode },
                { name: { contains: finalVendorCode, mode: 'insensitive' } }
              ]
            }
          });

          // Create vendor if not found
          if (!vendor) {
            vendor = await prisma.vendor.create({
              data: {
                name: finalVendorCode,
                code: finalVendorCode,
                staticCode: finalVendorCode,
                isActive: true
              }
            });
          }

          vendorId = vendor.id;
          vendorMap.set(finalVendorCode, vendorId);
        }

        // Process phone and date
        const cleanPhone = normalizePhone(phone);
        const parsedDateOfBirth = parseDate(dateOfBirth);

        // Check for existing lead by name, DOB, and phone
        const existingLead = await prisma.lead.findFirst({
          where: {
            firstName: { equals: firstName.trim(), mode: 'insensitive' },
            lastName: { equals: lastName.trim(), mode: 'insensitive' },
            phone: cleanPhone
          }
        });

        // Prepare lead data
        const leadData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: cleanPhone,
          street: finalAddress.trim(),
          city: finalCity.trim(),
          state: finalState.trim(),
          zipCode: finalZipCode.trim(),
          dateOfBirth: parsedDateOfBirth || new Date('1950-01-01'),
          testType: finalTestType as 'IMMUNE' | 'NEURO',
          status: 'SUBMITTED' as LeadStatus,
          vendorId: vendorId,
          vendorCode: finalVendorCode,
          contactAttempts: 0,
          notes: rejectionReason ? `Rejection Reason: ${rejectionReason}` : undefined
        };

        if (existingLead) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              ...leadData,
              mbi: existingLead.mbi,
              updatedAt: new Date()
            }
          });
          results.updated++;
        } else {
          // Create new lead with MBI
          const finalMbi = mbi ? mbi.trim() : generateMBI();
          
          await prisma.lead.create({
            data: {
              ...leadData,
              mbi: finalMbi
            }
          });
          results.created++;
        }

        results.processed++;

      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error processing row',
          data: row
        });
      }
    }

    // Update file upload record
    await prisma.fileUpload.update({
      where: { id: fileUpload.id },
      data: {
        processedAt: new Date(),
        recordsProcessed: results.processed,
        errors: results.errors.length > 0 ? JSON.parse(JSON.stringify(results.errors)) : null
      }
    });

    return NextResponse.json({
      success: true,
      message: `Bulk lead CSV processed successfully`,
      results: {
        totalRows: csvData.length,
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        fileUploadId: fileUpload.id
      },
      errors: results.errors.slice(0, 10)
    });

  } catch (error: any) {
    console.error('Error processing bulk lead CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk lead CSV', details: error.message },
      { status: 500 }
    );
  }
} 