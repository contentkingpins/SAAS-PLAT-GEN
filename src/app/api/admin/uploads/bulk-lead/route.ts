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

    // Check file size (limit to 10MB to prevent timeouts)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB. Please split large files into smaller chunks.' },
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

    // Limit row count to prevent timeouts
    const maxRows = 5000;
    if (csvData.length > maxRows) {
      return NextResponse.json(
        { error: `Too many rows (${csvData.length}). Maximum is ${maxRows} rows per upload. Please split your file into smaller chunks.` },
        { status: 400 }
      );
    }

    // Get column names for debugging
    const columnNames = Object.keys(csvData[0] || {});
    console.log(`📋 CSV column names found:`, columnNames);
    console.log(`🔄 Starting optimized bulk lead upload with ${csvData.length} rows`);

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

    // Pre-fetch BULK_UPLOAD vendor to avoid repeated lookups
    let bulkUploadVendor = await prisma.vendor.findFirst({
      where: { code: 'BULK_UPLOAD' }
    });

    if (!bulkUploadVendor) {
      bulkUploadVendor = await prisma.vendor.create({
        data: {
          name: 'BULK_UPLOAD',
          code: 'BULK_UPLOAD',
          staticCode: 'BULK_UPLOAD',
          isActive: true
        }
      });
      console.log('✅ Created BULK_UPLOAD vendor for tracking bulk imports');
    }

    const vendorId = bulkUploadVendor.id;
    
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

    // OPTIMIZED: Process in batches to prevent timeouts
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(csvData.length / BATCH_SIZE);
    
    console.log(`📦 Processing ${csvData.length} rows in ${totalBatches} batches of ${BATCH_SIZE}`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, csvData.length);
      const batch = csvData.slice(startIdx, endIdx);
      
      console.log(`📦 Processing batch ${batchIndex + 1}/${totalBatches} (rows ${startIdx + 1}-${endIdx})`);

      // Process batch
      const batchLeads = [];
      const batchPhones = [];
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowNumber = startIdx + i + 2; // Account for header row
        
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

          // Process date with fallback
          const parsedDateOfBirth = parseDate(dateOfBirth) || new Date('1950-01-01');

          // Prepare lead data
          const leadData = {
            firstName: firstName,
            lastName: lastName,
            phone: cleanPhone,
            street: address,
            city: city,
            state: state,
            zipCode: zipCode,
            dateOfBirth: parsedDateOfBirth,
            testType: finalTestType as 'IMMUNE' | 'NEURO',
            status: 'SUBMITTED' as LeadStatus,
            vendorId: vendorId,
            vendorCode: 'BULK_UPLOAD',
            contactAttempts: 0,
            mbi: mbi || generateMBI(),
            rowNumber: rowNumber
          };

          batchLeads.push(leadData);
          batchPhones.push(cleanPhone);

        } catch (error: any) {
          console.error(`❌ Error processing row ${rowNumber}:`, error);
          results.errors.push({
            row: rowNumber,
            error: error.message || 'Unknown error processing row',
            data: row
          });
        }
      }

      if (batchLeads.length === 0) {
        continue; // Skip empty batch
      }

      // OPTIMIZED: Batch check for existing leads
      const existingLeads = await prisma.lead.findMany({
        where: {
          phone: { in: batchPhones }
        },
        select: { phone: true, id: true, firstName: true, lastName: true }
      });

      const existingPhoneMap = new Map();
      existingLeads.forEach(lead => {
        const key = `${lead.firstName.toLowerCase()}_${lead.lastName.toLowerCase()}_${lead.phone}`;
        existingPhoneMap.set(key, lead);
      });

      // OPTIMIZED: Batch operations
      const leadsToCreate = [];
      const leadsToUpdate = [];

      for (const leadData of batchLeads) {
        const key = `${leadData.firstName.toLowerCase()}_${leadData.lastName.toLowerCase()}_${leadData.phone}`;
        const existingLead = existingPhoneMap.get(key);

        if (existingLead) {
          // Update existing
          leadsToUpdate.push({
            id: existingLead.id,
            data: leadData
          });
        } else {
          // Create new - ensure unique MBI
          let finalMbi = leadData.mbi;
          if (!finalMbi || finalMbi === '') {
            finalMbi = generateMBI();
          }
          
          leadsToCreate.push({
            ...leadData,
            mbi: finalMbi
          });
        }
      }

      // OPTIMIZED: Batch create new leads
      if (leadsToCreate.length > 0) {
        // Check for MBI conflicts in batch
        const mbis = leadsToCreate.map(l => l.mbi).filter(mbi => mbi);
        if (mbis.length > 0) {
          const existingMbis = await prisma.lead.findMany({
            where: { mbi: { in: mbis } },
            select: { mbi: true }
          });
          const existingMbiSet = new Set(existingMbis.map(l => l.mbi));

          // Generate new MBIs for conflicts
          for (const lead of leadsToCreate) {
            while (existingMbiSet.has(lead.mbi)) {
              lead.mbi = generateMBI();
            }
            existingMbiSet.add(lead.mbi); // Track new MBIs to avoid duplicates within batch
          }
        }

        await prisma.lead.createMany({
          data: leadsToCreate.map(({ rowNumber, ...lead }) => lead),
          skipDuplicates: true
        });
        results.created += leadsToCreate.length;
        console.log(`✅ Created ${leadsToCreate.length} new leads in batch ${batchIndex + 1}`);
      }

      // OPTIMIZED: Batch update existing leads
      if (leadsToUpdate.length > 0) {
        const updatePromises = leadsToUpdate.map(({ id, data }) =>
          prisma.lead.update({
            where: { id },
            data: {
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone,
              street: data.street,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              dateOfBirth: data.dateOfBirth,
              testType: data.testType,
              vendorId: data.vendorId,
              vendorCode: data.vendorCode,
              updatedAt: new Date()
            }
          })
        );

        await Promise.all(updatePromises);
        results.updated += leadsToUpdate.length;
        console.log(`✅ Updated ${leadsToUpdate.length} existing leads in batch ${batchIndex + 1}`);
      }

      results.processed += batchLeads.length;
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
    console.log('🎉 Optimized bulk lead upload completed:', {
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
      message: `Successfully processed ${results.processed} records in ${totalBatches} batches. Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`,
      results: {
        totalRows: csvData.length,
        processed: results.processed,
        created: results.created,
        updated: results.updated,
        errors: results.errors.length,
        batches: totalBatches,
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