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
function findColumnName(headers: string[], possibleNames: string[]): string {
  for (const name of possibleNames) {
    // Try exact match (case-sensitive)
    if (headers.includes(name)) {
      return name;
    }
    
    // Try case-insensitive match
    const matchingKey = headers.find(key => 
      key.toLowerCase() === name.toLowerCase()
    );
    if (matchingKey) {
      return matchingKey;
    }
    
    // Try partial match (case-insensitive)
    const partialMatch = headers.find(key => 
      key.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(key.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch;
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
      
      console.log(`📦 Detected file format: ${fileType} (tabs: ${tabCount}, commas: ${commaCount})`);
      
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

    // Get column names for debugging
    const columnNames = Object.keys(csvData[0] || {});
    console.log(`📦 Shipping CSV column names found:`, columnNames);

    // Create file upload record
    const fileUpload = await prisma.fileUpload.create({
      data: {
        type: 'SHIPPING_REPORT' as FileUploadType,
        fileName: file.name,
        fileUrl: `uploads/shipping-report/${Date.now()}-${file.name}`,
        uploadedById: userId,
        recordsProcessed: 0
      }
    });

    // Get available collections agents for auto-assignment
    const collectionsAgents = await prisma.user.findMany({
      where: { 
        role: 'COLLECTIONS',
        isActive: true 
      },
      select: { id: true, firstName: true, lastName: true }
    });

    console.log(`📋 Found ${collectionsAgents.length} active collections agents for auto-assignment`);

    // Process results tracking
    const results = {
      processed: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string; data?: any }>
    };

    console.log(`📦 Processing shipping report CSV with ${csvData.length} rows`);

    // Enhanced column mapping for shipping reports
    const columnMapping = {
      // Patient identifiers
      mbi: findColumnName(columnNames, ['mbi', 'medicare_beneficiary_identifier', 'medicare_id', 'member_id']),
      patientId: findColumnName(columnNames, ['patient_id', 'patientid', 'id', 'lead_id', 'customer_id']),
      
      // Name fields - including exact shipping format
      firstName: findColumnName(columnNames, ['first_name', 'firstname', 'fname', 'given_name', 'patient_first_name']),
      lastName: findColumnName(columnNames, ['last_name', 'lastname', 'lname', 'family_name', 'surname', 'patient_last_name']),
      fullName: findColumnName(columnNames, [
        'full_name', 'fullname', 'name', 'patient_name', 'customer_name',
        'shiptocompanyorname', 'shipto_company_or_name', 'ship_to_company_or_name'  // Exact shipping format
      ]),
      
      // Contact information - including exact shipping format
      phone: findColumnName(columnNames, ['phone', 'phone_number', 'tel', 'telephone', 'mobile', 'cell', 'contact_number']),
      email: findColumnName(columnNames, [
        'email', 'email_address', 'e_mail', 'contact_email',
        'shiptoemailaddress', 'shipto_email_address', 'ship_to_email_address'  // Exact shipping format
      ]),
      
      // Address fields - including exact shipping format with all address lines
      address1: findColumnName(columnNames, [
        'address', 'street', 'street_address', 'addr1', 'address1',
        'shiptoaddress1', 'shipto_address1', 'ship_to_address1'  // Exact shipping format
      ]),
      address2: findColumnName(columnNames, [
        'address2', 'addr2', 'street2',
        'shiptoaddress2', 'shipto_address2', 'ship_to_address2'  // Exact shipping format
      ]),
      address3: findColumnName(columnNames, [
        'address3', 'addr3', 'street3',
        'shiptoaddress3', 'shipto_address3', 'ship_to_address3'  // Exact shipping format
      ]),
      city: findColumnName(columnNames, [
        'city', 'town',
        'cityortown', 'city_or_town', 'ship_to_city',
        'shiptocityortown', 'shipto_city_or_town'  // Exact shipping format
      ]),
              state: findColumnName(columnNames, [
          'state', 'province', 'region', 'county',
          'ship_to_state',
          'shiptostateprovincecount', 'shipto_state_province_county'  // Exact shipping format
        ]),
      zip: findColumnName(columnNames, [
        'zip', 'zipcode', 'zip_code', 'postal_code', 'postcode',
        'postalcode', 'ship_to_zip',
        'shiptopostalcode', 'shipto_postal_code'  // Exact shipping format
      ]),
      zip2: findColumnName(columnNames, [
        'zip2', 'zipcode2', 'zip_code2', 'postal_code2', 'postcode2',
        'shiptopostalcode2', 'shipto_postal_code2'  // Exact shipping format
      ]),
      country: findColumnName(columnNames, [
        'country', 'territory',
        'shiptocountryterritory', 'shipto_country_territory', 'ship_to_country'  // Exact shipping format
      ]),
      
      // Date of birth
      dateOfBirth: findColumnName(columnNames, ['dob', 'date_of_birth', 'dateofbirth', 'birth_date', 'birthdate']),
      
      // Shipping information - including exact shipping format
      trackingNumber: findColumnName(columnNames, [
        'tracking_number', 'tracking', 'track_num', 'shipment_id', 'tracking_id',
        'packagetrackingnumber', 'package_tracking_number'  // Exact shipping format!
      ]),
      shippedDate: findColumnName(columnNames, ['shipped_date', 'ship_date', 'date_shipped', 'shipping_date']),
      
      // Additional shipping fields - exact format
      attention: findColumnName(columnNames, ['shiptoattention', 'shipto_attention', 'ship_to_attention', 'attention'])
    };

    console.log(`📦 Enhanced column mapping for shipping format:`, columnMapping);

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // Account for header row
      
      try {
        // Extract data using flexible column mapping
        const mbi = row[columnMapping.mbi] || '';
        const patientId = row[columnMapping.patientId] || '';
        
        // Handle name fields (full name or first/last) - prioritize shipping format
        let firstName = row[columnMapping.firstName] || '';
        let lastName = row[columnMapping.lastName] || '';
        
        // If fullName provided (like ShipToCompanyorName), try to split it
        if (!firstName && !lastName && row[columnMapping.fullName]) {
          const fullNameValue = row[columnMapping.fullName].trim();
          console.log(`📦 Parsing patient name from shipping field: "${fullNameValue}"`);
          
          // Handle various name formats
          if (fullNameValue.includes(',')) {
            // Format: "Smith, John" or "Smith, John M"
            const [lastPart, firstPart] = fullNameValue.split(',').map((s: string) => s.trim());
            lastName = lastPart;
            firstName = firstPart.split(' ')[0]; // Take first word as first name
          } else {
            // Format: "John Smith" or "John M Smith"
            const nameParts = fullNameValue.split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(-1)[0] || ''; // Take last word as last name
          }
          console.log(`📦 Parsed name: "${firstName}" "${lastName}"`);
        }
        
        // Extract shipping address information
        const phone = row[columnMapping.phone] || '';
        const email = row[columnMapping.email] || '';
        const address1 = row[columnMapping.address1] || '';
        const address2 = row[columnMapping.address2] || '';
        const address3 = row[columnMapping.address3] || '';
        const city = row[columnMapping.city] || '';
        const state = row[columnMapping.state] || '';
        const zip = row[columnMapping.zip] || '';
        const zip2 = row[columnMapping.zip2] || '';
        const dateOfBirth = row[columnMapping.dateOfBirth] || '';
        const trackingNumber = row[columnMapping.trackingNumber] || ''; // No auto-generation
        const shippedDate = row[columnMapping.shippedDate] || ''; // No auto-generation
        const attention = row[columnMapping.attention] || '';
        const country = row[columnMapping.country] || '';

        console.log(`📦 Row ${rowNumber}: Processing shipping to ${firstName} ${lastName} - Address-based matching`);
        console.log(`🔍 Available shipping data:`, {
          patientName: `${firstName} ${lastName}`,
          fullAddress: `${address1}, ${city}, ${state} ${zip}`,
          mbi: mbi || 'not provided',
          phone: phone ? `${phone} -> ${normalizePhone(phone)}` : 'not provided',
          email: email || 'not provided',
          attention: attention || 'not provided',
          trackingNumber: trackingNumber || 'not provided',
          shippedDate: shippedDate || 'not provided',
          country: country || 'not provided'
        });

        // Enhanced matching strategies - prioritize address-based matching for shipping
        let matchingLeads = [];
        let matchStrategy = '';

        // Strategy 1: MBI (if available)
        if (mbi && mbi.trim() !== '') {
          const leadsByMbi = await prisma.lead.findMany({
            where: { mbi: mbi.trim() }
          });
          if (leadsByMbi.length > 0) {
            matchingLeads.push(...leadsByMbi);
            matchStrategy = 'MBI';
            console.log(`✅ Strategy 1 - MBI "${mbi}": found ${leadsByMbi.length} leads`);
          }
        }

        // Strategy 2: Patient ID (if available)
        if (matchingLeads.length === 0 && patientId && patientId.trim() !== '') {
          const leadsByPatientId = await prisma.lead.findMany({
            where: { id: patientId.trim() }
          });
          if (leadsByPatientId.length > 0) {
            matchingLeads.push(...leadsByPatientId);
            matchStrategy = 'Patient ID';
            console.log(`✅ Strategy 2 - Patient ID "${patientId}": found ${leadsByPatientId.length} leads`);
          }
        }

        // Strategy 3: Name + Full Address (perfect match for shipping)
        if (matchingLeads.length === 0 && firstName && lastName && address1 && city && state) {
          const leadsByNameFullAddress = await prisma.lead.findMany({
            where: {
              firstName: { equals: firstName.trim(), mode: 'insensitive' },
              lastName: { equals: lastName.trim(), mode: 'insensitive' },
              street: { contains: address1.trim(), mode: 'insensitive' },
              city: { equals: city.trim(), mode: 'insensitive' },
              state: { equals: state.trim(), mode: 'insensitive' }
            }
          });
          if (leadsByNameFullAddress.length > 0) {
            matchingLeads.push(...leadsByNameFullAddress);
            matchStrategy = 'Name + Full Address';
            console.log(`✅ Strategy 3 - Name + Full Address "${firstName} ${lastName}" at "${address1}, ${city}, ${state}": found ${leadsByNameFullAddress.length} leads`);
          }
        }

        // Strategy 4: Name + Address + ZIP
        if (matchingLeads.length === 0 && firstName && lastName && address1 && zip) {
          const leadsByNameAddressZip = await prisma.lead.findMany({
            where: {
              firstName: { equals: firstName.trim(), mode: 'insensitive' },
              lastName: { equals: lastName.trim(), mode: 'insensitive' },
              street: { contains: address1.trim(), mode: 'insensitive' },
              zipCode: zip.trim()
            }
          });
          if (leadsByNameAddressZip.length > 0) {
            matchingLeads.push(...leadsByNameAddressZip);
            matchStrategy = 'Name + Address + ZIP';
            console.log(`✅ Strategy 4 - Name + Address + ZIP "${firstName} ${lastName}" + "${address1}" + "${zip}": found ${leadsByNameAddressZip.length} leads`);
          }
        }

        // Strategy 5: Name + City + State (broader address match)
        if (matchingLeads.length === 0 && firstName && lastName && city && state) {
          const leadsByNameCityState = await prisma.lead.findMany({
            where: {
              firstName: { equals: firstName.trim(), mode: 'insensitive' },
              lastName: { equals: lastName.trim(), mode: 'insensitive' },
              city: { equals: city.trim(), mode: 'insensitive' },
              state: { equals: state.trim(), mode: 'insensitive' }
            }
          });
          if (leadsByNameCityState.length > 0) {
            matchingLeads.push(...leadsByNameCityState);
            matchStrategy = 'Name + City + State';
            console.log(`✅ Strategy 5 - Name + City + State "${firstName} ${lastName}" in "${city}, ${state}": found ${leadsByNameCityState.length} leads`);
          }
        }

        // Strategy 6: Address + ZIP only (if patient name parsing failed)
        if (matchingLeads.length === 0 && address1 && zip) {
          const leadsByAddressZip = await prisma.lead.findMany({
            where: {
              street: { contains: address1.trim(), mode: 'insensitive' },
              zipCode: zip.trim()
            }
          });
          if (leadsByAddressZip.length > 0) {
            matchingLeads.push(...leadsByAddressZip);
            matchStrategy = 'Address + ZIP';
            console.log(`✅ Strategy 6 - Address + ZIP "${address1}" + "${zip}": found ${leadsByAddressZip.length} leads`);
          }
        }

        // Strategy 7: Name + Phone (if phone provided in attention or other field)
        if (matchingLeads.length === 0 && firstName && lastName && phone) {
          const leadsByNamePhone = await prisma.lead.findMany({
            where: {
              firstName: { equals: firstName.trim(), mode: 'insensitive' },
              lastName: { equals: lastName.trim(), mode: 'insensitive' },
              phone: normalizePhone(phone)
            }
          });
          if (leadsByNamePhone.length > 0) {
            matchingLeads.push(...leadsByNamePhone);
            matchStrategy = 'Name + Phone';
            console.log(`✅ Strategy 7 - Name + Phone "${firstName} ${lastName}" + "${normalizePhone(phone)}": found ${leadsByNamePhone.length} leads`);
          }
        }

        if (matchingLeads.length === 0) {
          console.log(`❌ No matching lead found using any strategy. Searched with:`, {
            patientName: `${firstName} ${lastName}`,
            fullAddress: `${address1}, ${city}, ${state} ${zip}`,
            mbi: mbi || 'none',
            phone: phone ? `${phone} -> ${normalizePhone(phone)}` : 'none',
            email: email || 'none',
            available_columns: Object.keys(row)
          });
          results.errors.push({
            row: rowNumber,
            error: `No matching lead found for ${firstName} ${lastName} at ${address1}, ${city}, ${state} ${zip}`,
            data: row
          });
          continue;
        } else {
          console.log(`✅ Found ${matchingLeads.length} matching lead(s) using strategy: ${matchStrategy}`, 
            matchingLeads.map(l => `${l.id}: ${l.firstName} ${l.lastName} at ${l.street}, ${l.city}, ${l.state}`)
          );
        }

        // Process each matching lead
        for (const lead of matchingLeads) {
          // Check if lead is already in a final status
          if (lead.status === 'SHIPPED' || lead.status === 'KIT_COMPLETED' || lead.status === 'RETURNED') {
            console.log(`⚠️ Lead ${lead.id} (${lead.firstName} ${lead.lastName}) already in final status: ${lead.status}`);
          } else {
            // Auto-approve and ship leads that haven't been shipped yet
            console.log(`📋 Auto-approving lead ${lead.id} (${lead.firstName} ${lead.lastName}) - Status: ${lead.status} → APPROVED → SHIPPED`);
          }

          // CRITICAL FIX: Auto-assign to collections agent when shipped
          let assignedCollectionsAgent = null;
          if (!lead.collectionsAgentId && collectionsAgents.length > 0) {
            // Simple round-robin assignment (you could implement more sophisticated logic)
            const agentIndex = results.updated % collectionsAgents.length;
            assignedCollectionsAgent = collectionsAgents[agentIndex];
            console.log(`👥 Auto-assigning lead ${lead.id} to collections agent: ${assignedCollectionsAgent.firstName} ${assignedCollectionsAgent.lastName}`);
          }

          // Update lead with shipping information
          const updateData: any = {
            status: 'SHIPPED' as const,
            collectionsNotes: lead.collectionsNotes 
              ? `${lead.collectionsNotes}\n\n📦 Shipping Update: Kit shipped${trackingNumber ? ` with tracking ${trackingNumber}` : ''}${shippedDate ? ` on ${shippedDate}` : ''}`
              : `📦 Shipping Update: Kit shipped${trackingNumber ? ` with tracking ${trackingNumber}` : ''}${shippedDate ? ` on ${shippedDate}` : ''}`,
            
            // CRITICAL: Assign to collections agent for visibility
            collectionsAgentId: assignedCollectionsAgent?.id || lead.collectionsAgentId
          };

          // Only update tracking number if provided
          if (trackingNumber && trackingNumber.trim() !== '') {
            updateData.trackingNumber = trackingNumber.trim();
            console.log(`📦 Setting tracking number: ${trackingNumber.trim()}`);
          }

          // Only update shipped date if provided
          if (shippedDate && shippedDate.trim() !== '') {
            updateData.kitShippedDate = parseDate(shippedDate) || new Date();
          }

          await prisma.lead.update({
            where: { id: lead.id },
            data: updateData
          });

          console.log(`✅ Updated lead ${lead.id} (${lead.firstName} ${lead.lastName}) with shipping info${assignedCollectionsAgent ? ` and assigned to ${assignedCollectionsAgent.firstName} ${assignedCollectionsAgent.lastName}` : ''}`);
          results.updated++;

          // Store additional shipping metadata in collections notes if available
          const shippingMetadata = {
            processedFrom: 'shipping-report-csv',
            matchedBy: matchStrategy,
            assignedToCollections: assignedCollectionsAgent ? `${assignedCollectionsAgent.firstName} ${assignedCollectionsAgent.lastName}` : 'existing agent'
          };
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

    console.log('📦 Shipping report processing complete:', results);

    return NextResponse.json({
      success: true,
      message: `Shipping report processed successfully. Updated ${results.updated} leads.`,
      results: {
        totalRows: csvData.length,
        processed: results.processed,
        updated: results.updated,
        errors: results.errors.length,
        fileUploadId: fileUpload.id
      },
      errors: results.errors.slice(0, 10) // Return first 10 errors for review
    });

  } catch (error: any) {
    console.error('❌ Error processing shipping report CSV:', error);
    return NextResponse.json(
      { error: 'Failed to process shipping report CSV', details: error.message },
      { status: 500 }
    );
  }
} 