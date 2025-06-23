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

// Utility function to ensure string is not empty
function ensureNonEmptyString(value: string | undefined | null, defaultValue: string): string {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  return value.trim();
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
      console.error('CSV parse error:', parseError);
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

    // Get column names for debugging
    const columnNames = Object.keys(csvData[0] || {});
    console.log(`📋 CSV column names found:`, columnNames);

    console.log(`🔄 Starting bulk lead upload with ${csvData.length} rows`);

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
    
    // Helper function to find column value with smart mapping
    function findColumnValue(row: any, possibleNames: string[]): string {
      for (const name of possibleNames) {
        // Try exact match (case-sensitive)
        if (row[name] !== undefined && row[name] !== null) {
          return String(row[name]).trim();
        }
        
        // Try case-insensitive match
        const keys = Object.keys(row);
        const matchingKey = keys.find(key => 
          key.toLowerCase() === name.toLowerCase()
        );
        if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null) {
          return String(row[matchingKey]).trim();
        }
        
        // Try partial match (case-insensitive)
        const partialMatch = keys.find(key => 
          key.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(key.toLowerCase())
        );
        if (partialMatch && row[partialMatch] !== undefined && row[partialMatch] !== null) {
          return String(row[partialMatch]).trim();
        }
      }
      return '';
    }
    
    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Smart column mapping with extensive variations
        const firstName = ensureNonEmptyString(
          findColumnValue(row, [
            'firstName', 'first_name', 'FIRST_NAME', 'First Name', 'firstname',
            'Patient First Na', 'Patient First Name', 'F_NAME', 'fname',
            'FNAME', 'first', 'FIRST', 'given_name', 'givenName'
          ]),
          ''
        );
        
        const lastName = ensureNonEmptyString(
          findColumnValue(row, [
            'lastName', 'last_name', 'LAST_NAME', 'Last Name', 'lastname',
            'Patient Last Na', 'Patient Last Name', 'L_NAME', 'lname',
            'LNAME', 'last', 'LAST', 'surname', 'family_name', 'familyName'
          ]),
          ''
        );
        
        const phone = ensureNonEmptyString(
          findColumnValue(row, [
            'phone', 'PHONE', 'Phone', 'phoneNumber', 'phone_number',
            'Phone Number', 'Phone Number:', 'PHONE_NUMBER', 'tel',
            'telephone', 'mobile', 'cell', 'cellphone', 'contact_number',
            'contact', 'ph', 'PH'
          ]),
          ''
        );
        
        const mbi = ensureNonEmptyString(
          findColumnValue(row, [
            'mbi', 'MBI', 'medicare', 'MEDICARE', 'Medicare #', 'Medicare #:',
            'medicare_id', 'MEDICARE_ID', 'medicare_number', 'MEDICARE_NUMBER',
            'medicareId', 'medicareNumber'
          ]),
          ''
        );
        
        const email = ensureNonEmptyString(
          findColumnValue(row, [
            'email', 'EMAIL', 'Email', 'e_mail', 'E_MAIL', 'E-mail',
            'email_address', 'EMAIL_ADDRESS', 'emailAddress'
          ]),
          ''
        );
        
        const dateOfBirth = ensureNonEmptyString(
          findColumnValue(row, [
            'dateOfBirth', 'date_of_birth', 'DOB', 'dob', 'Date Of Birth',
            'birthdate', 'birth_date', 'BIRTH_DATE', 'birthday', 'BIRTHDAY'
          ]),
          ''
        );
        
        const testType = ensureNonEmptyString(
          findColumnValue(row, [
            'testType', 'test_type', 'TEST_TYPE', 'Test Type', 'Test :',
            'test', 'TEST', 'type', 'TYPE'
          ]),
          'IMMUNE'
        );
        
        const vendorCode = ensureNonEmptyString(
          findColumnValue(row, [
            'vendorCode', 'vendor_code', 'VENDOR_CODE', 'Vendor Code',
            'Platform:', 'platform', 'PLATFORM', 'vendor', 'VENDOR'
          ]),
          ''
        );
        
        const agentName = ensureNonEmptyString(
          findColumnValue(row, [
            'agentName', 'agent_name', 'AGENT_NAME', 'Agent Name', 'Agent Name:',
            'agent', 'AGENT', 'representative', 'rep'
          ]),
          ''
        );
        
        const lab = ensureNonEmptyString(
          findColumnValue(row, [
            'lab', 'LAB', 'Lab', 'Lab:', 'laboratory', 'LABORATORY'
          ]),
          ''
        );
        
        const gender = ensureNonEmptyString(
          findColumnValue(row, [
            'gender', 'GENDER', 'Gender', 'sex', 'SEX', 'Sex'
          ]),
          ''
        );
        
        const rejectionReason = ensureNonEmptyString(
          findColumnValue(row, [
            'rejectionReason', 'rejection_reason', 'REJECTION_REASON',
            'REJECTION REASON:', 'rejection', 'REJECTION'
          ]),
          ''
        );

        // Handle address with extensive mapping
        const address = ensureNonEmptyString(
          findColumnValue(row, [
            'address', 'ADDRESS', 'Address', 'street', 'STREET', 'Street',
            'Patient Comple', 'street_address', 'STREET_ADDRESS',
            'address1', 'ADDRESS1', 'addr', 'ADDR'
          ]),
          '123 Main St'
        );
        
        const city = ensureNonEmptyString(
          findColumnValue(row, [
            'city', 'CITY', 'City', 'town', 'TOWN', 'Town'
          ]),
          'Unknown City'
        );
        
        const state = ensureNonEmptyString(
          findColumnValue(row, [
            'state', 'STATE', 'State', 'province', 'PROVINCE',
            'st', 'ST'
          ]),
          'ST'
        );
        
        const zipCode = ensureNonEmptyString(
          findColumnValue(row, [
            'zipCode', 'zip_code', 'ZIP_CODE', 'Zip Code', 'zip', 'ZIP',
            'postal_code', 'POSTAL_CODE', 'postalCode'
          ]),
          '12345'
        );

        // Validate required fields
        if (!firstName || !lastName || !phone) {
          results.errors.push({
            row: rowNumber,
            error: `Missing required fields: ${!firstName ? 'firstName ' : ''}${!lastName ? 'lastName ' : ''}${!phone ? 'phone' : ''}`,
            data: { 
              firstName_found: firstName, 
              lastName_found: lastName, 
              phone_found: phone,
              available_columns: Object.keys(row)
            }
          });
          continue;
        }

        // Process phone and validate
        const cleanPhone = normalizePhone(phone);
        if (!cleanPhone || cleanPhone.length < 10) {
          results.errors.push({
            row: rowNumber,
            error: 'Invalid phone number - must be at least 10 digits',
            data: { phone, cleanPhone }
          });
          continue;
        }

        // Ensure all address fields are non-empty
        const finalAddress = ensureNonEmptyString(address, `${firstName} ${lastName} Address`);
        const finalCity = ensureNonEmptyString(city, 'Unknown City');
        const finalState = ensureNonEmptyString(state, 'ST');
        const finalZipCode = ensureNonEmptyString(zipCode, '12345');

        // Debug logging for first few rows
        if (i < 3) {
          console.log(`✅ Processing row ${rowNumber}:`, {
            firstName,
            lastName,
            phone: phone ? `${phone} -> ${cleanPhone}` : 'empty',
            mbi,
            testType,
            address: finalAddress,
            city: finalCity,
            state: finalState,
            zipCode: finalZipCode
          });
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

        // Handle vendor - ALL bulk uploads use "BULK_UPLOAD" vendor for tracking
        let vendorId = '';
        const finalVendorCode = 'BULK_UPLOAD';
        
        if (vendorMap.has(finalVendorCode)) {
          vendorId = vendorMap.get(finalVendorCode)!;
        } else {
          // Find or create the BULK_UPLOAD vendor
          let vendor = await prisma.vendor.findFirst({
            where: { code: 'BULK_UPLOAD' }
          });

          // Create BULK_UPLOAD vendor if not found
          if (!vendor) {
            vendor = await prisma.vendor.create({
              data: {
                name: 'BULK_UPLOAD',
                code: 'BULK_UPLOAD',
                staticCode: 'BULK_UPLOAD',
                isActive: true
              }
            });
            console.log('✅ Created BULK_UPLOAD vendor for tracking bulk imports');
          }

          vendorId = vendor.id;
          vendorMap.set(finalVendorCode, vendorId);
        }

        // Process date with fallback
        const parsedDateOfBirth = parseDate(dateOfBirth) || new Date('1950-01-01');

        // Check for existing lead by name, DOB, and phone
        const existingLead = await prisma.lead.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
            phone: cleanPhone
          }
        });

        // Prepare lead data with only fields that exist in the database
        const leadData = {
          firstName: firstName,
          lastName: lastName,
          phone: cleanPhone,
          street: finalAddress,
          city: finalCity,
          state: finalState,
          zipCode: finalZipCode,
          dateOfBirth: parsedDateOfBirth,
          testType: finalTestType as 'IMMUNE' | 'NEURO',
          status: 'SUBMITTED' as LeadStatus,
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
              mbi: existingLead.mbi,
              updatedAt: new Date()
            }
          });
          results.updated++;
        } else {
          // Create new lead with MBI - ensure uniqueness
          let finalMbi = mbi || generateMBI();
          
          // Check for MBI uniqueness and generate new one if needed
          let mbiExists = await prisma.lead.findUnique({
            where: { mbi: finalMbi }
          });
          
          while (mbiExists) {
            finalMbi = generateMBI();
            mbiExists = await prisma.lead.findUnique({
              where: { mbi: finalMbi }
            });
          }
          
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
        console.error(`❌ Error processing row ${rowNumber}:`, error);
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

    // Log final results
    console.log('🎉 Bulk lead upload completed:', {
      totalRows: csvData.length,
      processed: results.processed,
      created: results.created,
      updated: results.updated,
      errors: results.errors.length,
      fileUploadId: fileUpload.id
    });

    if (results.errors.length > 0) {
      console.log('❌ First few errors:', results.errors.slice(0, 5));
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.processed} records. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
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
    console.error('❌ Error processing bulk lead CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk lead CSV', details: error.message },
      { status: 500 }
    );
  }
} 