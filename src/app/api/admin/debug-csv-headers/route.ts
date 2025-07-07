import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
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
  }
} 