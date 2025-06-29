import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminAuth } from '@/lib/auth/middleware';
import { parse } from 'csv-parse/sync';
import { FileUploadType, DoctorApprovalStatus, LeadStatus } from '@prisma/client';

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

// Determine approval status from CSV data
function determineApprovalStatus(row: any): DoctorApprovalStatus {
  const status = row['STATUS'] || row['APPROVAL_STATUS'] || row['DECISION'] || '';
  const decision = row['DECISION'] || row['APPROVAL'] || row['APPROVED'] || '';
  
  const statusLower = status.toLowerCase().trim();
  const decisionLower = decision.toLowerCase().trim();
  
  // Check for approval indicators
  if (statusLower.includes('approved') || statusLower.includes('approve') ||
      decisionLower.includes('approved') || decisionLower.includes('approve') ||
      decisionLower === 'yes' || statusLower === 'yes') {
    return 'APPROVED';
  }
  
  // Check for denial indicators
  if (statusLower.includes('denied') || statusLower.includes('deny') ||
      statusLower.includes('declined') || statusLower.includes('decline') ||
      decisionLower.includes('denied') || decisionLower.includes('deny') ||
      decisionLower.includes('declined') || decisionLower.includes('decline') ||
      decisionLower === 'no' || statusLower === 'no') {
    return 'DECLINED';
  }
  
  // Default to pending if unclear
  return 'PENDING';
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

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv')) {
      return NextResponse.json(
        { error: 'File must be a CSV or TSV file' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV/TSV - Auto-detect delimiter
    let csvData;
    try {
      // First, try to detect if it's tab-separated (TSV) or comma-separated (CSV)
      const firstLine = fileContent.split('\n')[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      
      // Use tab delimiter if there are more tabs than commas
      const delimiter = tabCount > commaCount ? '\t' : ',';
      const fileType = delimiter === '\t' ? 'TSV' : 'CSV';
      
      console.log(`🏥 Detected file format: ${fileType} (tabs: ${tabCount}, commas: ${commaCount})`);
      
      csvData = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: delimiter
      });
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid CSV/TSV format', details: parseError },
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
        type: 'DOCTOR_APPROVAL' as FileUploadType,
        fileName: file.name,
        fileUrl: `uploads/doctor-approval/${Date.now()}-${file.name}`,
        uploadedById: userId,
        recordsProcessed: 0
      }
    });

    // Process results tracking
    const results = {
      processed: 0,
      approved: 0,
      denied: 0,
      pending: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>
    };

    // Get column names for debugging
    const columnNames = Object.keys(csvData[0] || {});
    console.log(`🏥 Approval CSV column names found:`, columnNames);

    console.log('🏥 Processing doctor approval CSV with', csvData.length, 'rows');

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Extract patient identifiers - try multiple column name variations
        const mbi = row['MBI#'] || row['MBI'] || row['MEDICARE_ID'] || row['PATIENT_ID'] || '';
        
        // Handle both separate name fields and full name field
        let firstName = row['FIRST_NAME'] || row['FIRSTNAME'] || row['FIRST NAME'] || '';
        let lastName = row['LAST_NAME'] || row['LASTNAME'] || row['LAST NAME'] || '';
        
        // If no separate names, try to parse full name (PT_FULL_NAME format)
        if (!firstName && !lastName && row['PT_FULL_NAME']) {
          const fullNameValue = row['PT_FULL_NAME'].trim();
          console.log(`🏥 Parsing full name: "${fullNameValue}"`);
          
          // Handle various name formats
          if (fullNameValue.includes(',')) {
            // Format: "LASTNAME, FIRSTNAME" or "LASTNAME, FIRSTNAME MIDDLE"
            const [lastPart, firstPart] = fullNameValue.split(',').map((s: string) => s.trim());
            lastName = lastPart;
            firstName = firstPart.split(' ')[0]; // Take first word as first name
          } else {
            // Format: "FIRSTNAME LASTNAME" or "FIRSTNAME MIDDLE LASTNAME"
            const nameParts = fullNameValue.split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(-1)[0] || ''; // Take last word as last name
          }
          console.log(`🏥 Parsed name: "${firstName}" "${lastName}"`);
        }
        
        const phone = row['PHONE'] || row['PHONE_NUMBER'] || row['PHONE NUMBER'] || '';
        const approvalDate = row['DATE_SEEN'] || row['DATE'] || row['APPROVAL_DATE'] || row['DECISION_DATE'] || '';
        
        // Skip rows with missing critical data
        if (!mbi && !firstName && !lastName && !phone) {
          results.errors.push({
            row: rowNumber,
            error: 'Missing patient identifier (need MBI, name, or phone)',
            data: { mbi, firstName, lastName, phone }
          });
          continue;
        }

        // Determine approval status
        const approvalStatus = determineApprovalStatus(row);
        const parsedApprovalDate = parseDate(approvalDate) || new Date();

        console.log(`🏥 Row ${rowNumber}: Processing ${firstName} ${lastName} (${mbi}) - Status: ${approvalStatus}`);

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

        if (matchingLeads.length === 0) {
          results.errors.push({
            row: rowNumber,
            error: `No matching lead found for ${firstName} ${lastName} (${mbi})`,
            data: row
          });
          continue;
        }

        // Update all matching leads
        for (const lead of matchingLeads) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              doctorApprovalStatus: approvalStatus,
              doctorApprovalDate: parsedApprovalDate,
                             // Update lead status based on approval decision
               status: approvalStatus === 'APPROVED' ? LeadStatus.APPROVED : 
                      approvalStatus === 'DECLINED' ? 'DOESNT_QUALIFY' as LeadStatus : 
                      lead.status, // Keep current status if pending
              updatedAt: new Date()
            }
          });

          console.log(`✅ Updated lead ${lead.id} (${lead.firstName} ${lead.lastName}) with ${approvalStatus} status`);
        }

        // Track results
        if (approvalStatus === 'APPROVED') results.approved++;
        else if (approvalStatus === 'DECLINED') results.denied++;
        else results.pending++;
        
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

    console.log('🏥 Doctor approval processing complete:', results);

    return NextResponse.json({
      success: true,
      message: `Doctor approval/denial file processed successfully`,
      results: {
        totalRows: csvData.length,
        processed: results.processed,
        approved: results.approved,
        denied: results.denied,
        pending: results.pending,
        errors: results.errors.length,
        fileUploadId: fileUpload.id
      },
      errors: results.errors.slice(0, 10) // Return first 10 errors for review
    });

  } catch (error: any) {
    console.error('Error processing doctor approval CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process doctor approval CSV', details: error.message },
      { status: 500 }
    );
  }
} 