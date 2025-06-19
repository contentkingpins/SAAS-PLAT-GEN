import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';
import { parse } from 'csv-parse/sync';
import { FileUploadType } from '@prisma/client';

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
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
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

    const results = {
      totalRows: csvData.length,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0
    };

    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // CSV row number (accounting for header)

      try {
        // Flexible column name handling
        const firstName = row['FIRST_NAME'] || row['First Name'] || row['firstName'] || row['first_name'] || '';
        const lastName = row['LAST_NAME'] || row['Last Name'] || row['lastName'] || row['last_name'] || '';
        const phone = row['PHONE'] || row['Phone'] || row['phone'] || row['PHONE_NUMBER'] || row['phoneNumber'] || '';
        const mbi = row['MBI'] || row['mbi'] || row['MEDICARE_ID'] || row['medicareId'] || '';
        const email = row['EMAIL'] || row['Email'] || row['email'] || '';
        const address = row['ADDRESS'] || row['Address'] || row['address'] || row['STREET'] || '';
        const city = row['CITY'] || row['City'] || row['city'] || '';
        const state = row['STATE'] || row['State'] || row['state'] || '';
        const zipCode = row['ZIP'] || row['Zip'] || row['zipCode'] || row['ZIP_CODE'] || '';
        const dateOfBirth = row['DOB'] || row['Date of Birth'] || row['dateOfBirth'] || row['DATE_OF_BIRTH'] || '';
        const testType = row['TEST_TYPE'] || row['Test Type'] || row['testType'] || row['test_type'] || 'IMMUNE';
        const vendorCode = row['VENDOR_CODE'] || row['Vendor Code'] || row['vendorCode'] || row['vendor_code'] || '';
        const status = row['STATUS'] || row['Status'] || row['status'] || 'SUBMITTED';

        // Validate required fields
        if (!firstName || !lastName || !phone || !address || !city || !state || !zipCode) {
          errors.push({ row: rowNumber, error: 'Missing required fields: firstName, lastName, phone, address, city, state, zipCode' });
          results.errors++;
          continue;
        }

        // Clean phone number
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          errors.push({ row: rowNumber, error: 'Phone number must be 10 digits' });
          results.errors++;
          continue;
        }

        // Find vendor by code if provided, default to first vendor if none specified
        let vendorId: string;
        let finalVendorCode = vendorCode || 'BULK_IMPORT';
        
        if (vendorCode) {
          const vendor = await prisma.vendor.findFirst({
            where: { code: vendorCode }
          });
          if (vendor) {
            vendorId = vendor.id;
            finalVendorCode = vendor.code;
          } else {
            // If vendor code provided but not found, use first available vendor
            const defaultVendor = await prisma.vendor.findFirst({
              where: { isActive: true }
            });
            vendorId = defaultVendor?.id || 'default-vendor-id';
            console.warn(`Vendor not found for code: ${vendorCode}, using default vendor`);
          }
        } else {
          // No vendor code provided, use first available vendor
          const defaultVendor = await prisma.vendor.findFirst({
            where: { isActive: true }
          });
          vendorId = defaultVendor?.id || 'default-vendor-id';
        }

        // Parse date of birth
        let parsedDateOfBirth: Date | undefined = undefined;
        if (dateOfBirth) {
          try {
            parsedDateOfBirth = new Date(dateOfBirth);
            if (isNaN(parsedDateOfBirth.getTime())) {
              parsedDateOfBirth = undefined;
            }
          } catch {
            parsedDateOfBirth = undefined;
          }
        }

        // Check for existing lead by phone + name combination
        const existingLead = await prisma.lead.findFirst({
          where: {
            phone: cleanPhone,
            firstName: firstName.trim(),
            lastName: lastName.trim()
          }
        });

        const leadData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: cleanPhone,
          street: address.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          dateOfBirth: parsedDateOfBirth || new Date('1950-01-01'), // Default DOB if not provided
          mbi: mbi ? mbi.trim() : `BULK_${cleanPhone}_${Date.now()}`, // Generate unique MBI if not provided
          testType: testType.toUpperCase() as 'IMMUNE' | 'NEURO',
          status: status.toUpperCase() as any,
          vendorId: vendorId,
          vendorCode: finalVendorCode,
          contactAttempts: 0
        };

        if (existingLead) {
          // Update existing lead
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              ...leadData,
              updatedAt: new Date()
            }
          });
          results.updated++;
        } else {
          // Create new lead
          await prisma.lead.create({
            data: leadData
          });
          results.created++;
        }

        results.processed++;

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ row: rowNumber, error: errorMessage });
        results.errors++;
      }
    }

    // Store upload record
    await prisma.fileUpload.create({
      data: {
        type: 'MASTER_DATA' as FileUploadType, // Using existing enum value
        fileName: file.name,
        fileUrl: `uploads/bulk-lead/${Date.now()}-${file.name}`,
        uploadedById: userId,
        recordsProcessed: results.processed,
        errors: errors.length > 0 ? JSON.parse(JSON.stringify(errors.slice(0, 50))) : null
      }
    });

    return NextResponse.json({
      success: true,
      results,
      errors: errors.slice(0, 10) // Return first 10 errors for display
    });

  } catch (error) {
    console.error('Bulk lead upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
} 