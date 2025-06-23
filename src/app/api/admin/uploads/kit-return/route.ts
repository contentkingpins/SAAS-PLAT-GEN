import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';
import { parse } from 'csv-parse/sync';
import { FileUploadType, LeadStatus } from '@prisma/client';

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

// Normalize phone numbers for matching
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

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

    // Get column names for debugging
    const columnNames = Object.keys(csvData[0] || {});
    console.log(`📋 Kit return CSV column names found:`, columnNames);

    // Create file upload record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        type: 'KIT_RETURN' as FileUploadType,
        fileName: file.name,
        fileUrl: `uploads/kit-return/${Date.now()}-${file.name}`,
        uploadedById: userId,
        recordsProcessed: 0
      }
    });

    // Process results tracking
    const results = {
      processed: 0,
      completed: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>
    };

    console.log(`📋 Processing kit return CSV with ${csvData.length} rows`);

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Smart column mapping for kit return data
        const mbi = findColumnValue(row, [
          'mbi', 'MBI', 'medicare', 'MEDICARE', 'Medicare #', 'Medicare #:',
          'medicare_id', 'MEDICARE_ID', 'patient_id', 'PATIENT_ID'
        ]);
        
        const firstName = findColumnValue(row, [
          'firstName', 'first_name', 'FIRST_NAME', 'First Name', 'firstname',
          'FNAME', 'fname', 'first', 'FIRST'
        ]);
        
        const lastName = findColumnValue(row, [
          'lastName', 'last_name', 'LAST_NAME', 'Last Name', 'lastname',
          'LNAME', 'lname', 'last', 'LAST'
        ]);
        
        const phone = findColumnValue(row, [
          'phone', 'PHONE', 'Phone', 'phoneNumber', 'phone_number',
          'Phone Number', 'PHONE_NUMBER', 'tel', 'telephone'
        ]);
        
        const trackingNumber = findColumnValue(row, [
          'trackingNumber', 'tracking_number', 'TRACKING_NUMBER', 'Tracking Number',
          'tracking', 'TRACKING', 'track', 'TRACK', 'shipment_id', 'SHIPMENT_ID',
          'return_tracking', 'RETURN_TRACKING'
        ]);
        
        const returnedDate = findColumnValue(row, [
          'returnedDate', 'returned_date', 'RETURNED_DATE', 'Returned Date',
          'return_date', 'RETURN_DATE', 'date_returned', 'DATE_RETURNED',
          'completion_date', 'COMPLETION_DATE', 'completed_date', 'COMPLETED_DATE'
        ]);
        
        const completionStatus = findColumnValue(row, [
          'status', 'STATUS', 'Status', 'completion_status', 'COMPLETION_STATUS',
          'completed', 'COMPLETED', 'Completed'
        ]);

        // Skip rows with missing critical identifiers
        if (!mbi && !firstName && !lastName && !phone && !trackingNumber) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing patient identifier (need MBI, name, phone, or tracking number)',
            data: { 
              mbi, firstName, lastName, phone, trackingNumber,
              available_columns: Object.keys(row)
            }
          });
          continue;
        }

        // Parse returned date
        const parsedReturnedDate = parseDate(returnedDate) || new Date();

        console.log(`📋 Row ${rowNumber}: Processing ${firstName} ${lastName} (${mbi}) - Status: ${completionStatus}`);

        // Find matching lead(s) using multiple criteria
        let matchingLeads = [];

        // First try MBI if available
        if (mbi && mbi.trim() !== '') {
          const leadsByMbi = await prisma.lead.findMany({
            where: { mbi: mbi.trim() }
          });
          matchingLeads.push(...leadsByMbi);
        }

        // If no MBI matches, try name and phone
        if (matchingLeads.length === 0 && firstName && lastName) {
          const leadsByName = await prisma.lead.findMany({
            where: {
              firstName: { equals: firstName.trim(), mode: 'insensitive' },
              lastName: { equals: lastName.trim(), mode: 'insensitive' },
              ...(phone && { phone: normalizePhone(phone) })
            }
          });
          matchingLeads.push(...leadsByName);
        }

        // If still no matches, try just phone
        if (matchingLeads.length === 0 && phone) {
          const leadsByPhone = await prisma.lead.findMany({
            where: { phone: normalizePhone(phone) }
          });
          matchingLeads.push(...leadsByPhone);
        }

        // Try finding by tracking number if provided
        if (matchingLeads.length === 0 && trackingNumber) {
          const leadsByTracking = await prisma.lead.findMany({
            where: { trackingNumber: trackingNumber.trim() }
          });
          matchingLeads.push(...leadsByTracking);
        }

        if (matchingLeads.length === 0) {
          results.errors.push({
            row: rowNumber,
            error: `No matching lead found for ${firstName} ${lastName} (${mbi})`,
            data: row
          });
          continue;
        }

        // Update all matching leads to completed status
        for (const lead of matchingLeads) {
          const updateData: any = {
            status: LeadStatus.KIT_COMPLETED,
            kitReturnedDate: parsedReturnedDate,
            updatedAt: new Date()
          };

          // Update collections disposition to indicate completion
          updateData.collectionsDisposition = 'KIT_COMPLETED';

          // Store completion metadata in collections notes
          const completionMetadata = {
            completionStatus: completionStatus || 'completed',
            returnTracking: trackingNumber || null,
            processedFrom: 'kit-return-csv'
          };
          
          if (lead.collectionsNotes) {
            updateData.collectionsNotes = `${lead.collectionsNotes}\n\nKit Completion: ${JSON.stringify(completionMetadata)}`;
          } else {
            updateData.collectionsNotes = `Kit Completion: ${JSON.stringify(completionMetadata)}`;
          }

          await prisma.lead.update({
            where: { id: lead.id },
            data: updateData
          });

          console.log(`✅ Marked lead ${lead.id} (${lead.firstName} ${lead.lastName}) as completed`);
        }

        results.completed += matchingLeads.length;
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

    console.log('📋 Kit return processing complete:', results);

    return NextResponse.json({
      success: true,
      message: `Kit return report processed successfully. Marked ${results.completed} leads as completed.`,
      results: {
        totalRows: csvData.length,
        processed: results.processed,
        completed: results.completed,
        errors: results.errors.length,
        fileUploadId: fileUpload.id
      },
      errors: results.errors.slice(0, 10) // Return first 10 errors for review
    });

  } catch (error: any) {
    console.error('❌ Error processing kit return CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process kit return CSV', details: error.message },
      { status: 500 }
    );
  }
} 