import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';
import { parse } from 'csv-parse/sync';
import { LeadStatus, FileUploadType } from '@prisma/client';

// Utility function to parse dates in various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Handle various date formats from the CSV
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

// Map vendor/lab names to vendor codes in the system
function mapVendorCode(labName: string): { vendorId: string | null, vendorCode: string } {
  const labMapping: { [key: string]: string } = {
    'Areahou': 'AREAHOU',
    'R & R Labs': 'RR_LABS', 
    'AlphaDera': 'ALPHADERA',
    'RTM GEN X': 'RTM_GENX',
    'GENX': 'GENX',
    'GEN X': 'GENX',
    'RTM': 'RTM',
    'JOLU': 'JOLU',
    'JO-LU': 'JOLU'
  };
  
  const normalizedLab = labName?.trim() || '';
  return {
    vendorId: null, // Will be resolved during processing
    vendorCode: labMapping[normalizedLab] || 'UNKNOWN'
  };
}

// Determine lead status based on CSV data
function determineLeadStatus(row: any): LeadStatus {
  const deliveryStatus = row['DELIVERY STATUS'] || row['Delivery Status'] || '';
  const notes = row['NOTES FOR YOU'] || row['OTHER'] || '';
  const completed = row['Completed'] || row['COMPLETED'] || '';
  
  // Check for completion indicators
  if (completed.toLowerCase().includes('completed') || 
      notes.toLowerCase().includes('completed') ||
      notes.toLowerCase().includes('arrived')) {
    return 'KIT_COMPLETED';
  }
  
  // Check delivery status
  if (deliveryStatus.toLowerCase().includes('delivered')) {
    return 'SHIPPED';
  }
  
  if (deliveryStatus.toLowerCase().includes('delayed')) {
    return 'READY_TO_SHIP';
  }
  
  // Default to submitted for new records
  return 'SUBMITTED';
}

// Generate unique MBI (reusing existing logic)
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

  // Get user ID from auth result (assuming it exists after successful auth)
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
        type: 'MASTER_DATA' as FileUploadType,
        fileName: file.name,
        fileUrl: `uploads/master-data/${Date.now()}-${file.name}`,
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

    // First pass: Get or create vendors
    const vendorMap = new Map<string, string>();
    
    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Extract and validate required fields
        const firstName = row['FIRST NAME']?.trim();
        const lastName = row['LAST NAME']?.trim();
        const dob = row['DOB']?.trim();
        const phone = row['PHONE NUMBER']?.trim();
        const labName = row['LAB']?.trim();
        
        // Skip rows with missing critical data
        if (!firstName || !lastName || !phone || !labName) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing required fields: First Name, Last Name, Phone, or Lab',
            data: { firstName, lastName, phone, labName }
          });
          continue;
        }

        // Get or create vendor
        let vendorId = vendorMap.get(labName);
        if (!vendorId) {
          const { vendorCode } = mapVendorCode(labName);
          
          // Try to find existing vendor
          let vendor = await prisma.vendor.findFirst({
            where: {
              OR: [
                { code: vendorCode },
                { name: { contains: labName, mode: 'insensitive' } }
              ]
            }
          });

          // Create vendor if not found
          if (!vendor) {
            vendor = await prisma.vendor.create({
              data: {
                name: labName,
                code: vendorCode,
                staticCode: vendorCode,
                isActive: true
              }
            });
          }

          vendorId = vendor.id;
          vendorMap.set(labName, vendorId);
        }

        // Process patient data
        const normalizedPhone = normalizePhone(phone);
        const parsedDob = parseDate(dob);
        
        if (!parsedDob) {
          results.errors.push({
            row: rowNumber,
            error: `Invalid date format: ${dob}`,
            data: row
          });
          continue;
        }

        // Generate MBI or use existing
        let mbi = generateMBI();
        
        // Check for existing lead by name, DOB, and phone
        const existingLead = await prisma.lead.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
            dateOfBirth: parsedDob,
            phone: normalizedPhone
          }
        });

        // Determine test type
        const testType = row['TEST']?.toUpperCase() === 'IMMUNO' ? 'IMMUNE' : 'NEURO';
        
        // Determine status
        const status = determineLeadStatus(row);
        
        // Prepare CSV metadata
        const csvMetadata = {
          trackingToPatient: row['TRACKING # TO PATIENT'],
          returnTracking: row['RETURN TRACKING #'],
          deliveryStatus: row['DELIVERY STATUS'],
          deliveryDate: row['DELIVERY DATE'],
          pickupTime: row['Pickup Time'],
          notes: row['NOTES FOR YOU'],
          other: row['OTHER']
        };
        
        // Prepare lead data
        const leadData = {
          firstName,
          lastName,
          dateOfBirth: parsedDob,
          phone: normalizedPhone,
          street: row['ADDRESS']?.trim() || '',
          city: row['CITY']?.trim() || '',
          state: row['STATE']?.trim() || '',
          zipCode: row['ZIP']?.trim() || '',
          vendorId,
          vendorCode: mapVendorCode(labName).vendorCode,
          testType: testType as 'IMMUNE' | 'NEURO',
          status,
          contactAttempts: 0,
          // Store additional CSV data as metadata
          notes: `CSV Import: ${JSON.stringify(csvMetadata)}`
        };

        if (existingLead) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              ...leadData,
              mbi: existingLead.mbi, // Keep existing MBI
              updatedAt: new Date()
            }
          });
          results.updated++;
        } else {
          // Create new lead
          await prisma.lead.create({
            data: {
              ...leadData,
              mbi
            }
          });
          results.created++;
        }

        results.processed++;

      } catch (error: any) {
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
      message: `Master CSV processed successfully`,
      results: {
        totalRows: csvData.length,
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        fileUploadId: fileUpload.id
      },
      errors: results.errors.slice(0, 10) // Return first 10 errors for review
    });

  } catch (error: any) {
    console.error('Error processing master CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process master CSV', details: error.message },
      { status: 500 }
    );
  }
} 