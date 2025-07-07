import { NextRequest, NextResponse } from 'next/server';
        main
import { parse } from 'csv-parse/sync';
import { verifyAdminAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse just the first few rows to see structure
    const firstLine = fileContent.split('\n')[0];
    const secondLine = fileContent.split('\n')[1];
    
    // Auto-detect delimiter
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';
    
    console.log('🔍 CSV DEBUG INFO:');
    console.log(`File: ${file.name}`);
    console.log(`Delimiter: ${delimiter === '\t' ? 'TAB' : 'COMMA'}`);
    console.log(`Headers: ${firstLine}`);
    console.log(`Sample data: ${secondLine}`);
    
    // Parse CSV
    const csvData = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: delimiter
    });
    
    const columnNames = Object.keys(csvData[0] || {});
    const sampleRow = csvData[0] || {};
    
    return NextResponse.json({
      success: true,
      debug: {
        fileName: file.name,
        delimiter: delimiter === '\t' ? 'TAB' : 'COMMA',
        totalRows: csvData.length,
        columnNames: columnNames,
        sampleRowData: sampleRow,
        firstFewRows: csvData.slice(0, 3),
        analysisHelp: {
          message: "Compare these column names with your CSV to identify mapping issues",
          lookFor: [
            "Name fields (first_name, last_name, full_name, ShipToCompanyorName)",
            "Address fields (address1, street, ShipToAddress1)",
            "Location fields (city, state, zip, ShipToCityorTown)",
            "Contact fields (phone, email, ShipToEmailAddress)",
            "Tracking fields (tracking_number, PackageTrackingNumber)"
          ]
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ error: 'Debug failed', details: error.message }, { status: 500 });
    
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    // Manual JWT verification for admin access only
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'healthcare-platform-jwt-secret-2024') as any;
        
        if (decoded.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
      } catch (jwtError) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileContent } = body;

    if (!fileName || !fileContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: fileName and fileContent' 
      }, { status: 400 });
    }

    // Decode CSV content
    const csvContent = Buffer.from(fileContent, 'base64').toString('utf-8');
    
    // Parse CSV with different delimiter options
    const delimiters = [',', ';', '\t', '|'];
    let bestParse = null;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const parseResult = Papa.parse(csvContent, { 
        header: true, 
        skipEmptyLines: true,
        delimiter,
        transformHeader: (header: string) => header.trim()
      });
      
      if (parseResult.data.length > 0 && Object.keys(parseResult.data[0] as any).length > 1) {
        bestParse = parseResult;
        bestDelimiter = delimiter;
        break;
      }
    }

    if (!bestParse || bestParse.data.length === 0) {
      return NextResponse.json({ 
        error: 'Could not parse CSV file - no valid data found',
        details: 'File may be empty or have invalid format'
      }, { status: 400 });
    }

    const firstRow = bestParse.data[0] as any;
    const columnNames = Object.keys(firstRow);
    
    // Detailed analysis
    const debug = {
      fileName,
      delimiter: bestDelimiter === ',' ? 'COMMA' : bestDelimiter === ';' ? 'SEMICOLON' : bestDelimiter === '\t' ? 'TAB' : 'PIPE',
      totalRows: bestParse.data.length,
      columnCount: columnNames.length,
      columnNames: columnNames,
      sampleRowData: firstRow,
      
      // Field matching analysis
      fieldAnalysis: {
        possibleNameFields: columnNames.filter(col => 
          /name|customer|patient|company/i.test(col)
        ),
        possibleAddressFields: columnNames.filter(col => 
          /address|street|shipto|ship_to/i.test(col)
        ),
        possibleLocationFields: columnNames.filter(col => 
          /city|state|zip|postal|town|province/i.test(col)
        ),
        possibleContactFields: columnNames.filter(col => 
          /email|phone|telephone|mobile/i.test(col)
        ),
        possibleTrackingFields: columnNames.filter(col => 
          /track|package|shipping/i.test(col)
        )
      },
      
      // Current mapping expectations
      expectedFields: {
        nameFields: ['firstName', 'first_name', 'fname', 'given_name', 'lastName', 'last_name', 'lname', 'family_name', 'fullName', 'full_name', 'name', 'ShipToCompanyorName'],
        addressFields: ['address1', 'street', 'street_address', 'ShipToAddress1', 'city', 'town', 'ShipToCityorTown', 'state', 'province', 'ShipToStateProvinceCount', 'zip', 'zipcode', 'postal_code', 'ShipToPostalCode'],
        contactFields: ['phone', 'phone_number', 'telephone', 'mobile', 'email', 'email_address', 'ShipToEmailAddress'],
        trackingFields: ['trackingNumber', 'tracking_number', 'PackageTrackingNumber']
      }
    };

    return NextResponse.json({
      success: true,
      message: `Successfully analyzed CSV file with ${debug.totalRows} rows and ${debug.columnCount} columns`,
      debug
    });

  } catch (error) {
    console.error('Error in CSV debug endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze CSV file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
        main
  }
} 