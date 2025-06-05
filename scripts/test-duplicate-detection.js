const { Client } = require('pg');
const crypto = require('crypto');

// Load database configuration
const databaseConfig = require('../database.config.js');

// Helper function to generate unique ID
function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// Helper function to generate MBI-like identifier
function generateMBI() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  
  return `${nums[Math.floor(Math.random() * 10)]}${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}-${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}${nums[Math.floor(Math.random() * 10)]}-${chars[Math.floor(Math.random() * 26)]}${chars[Math.floor(Math.random() * 26)]}${nums[Math.floor(Math.random() * 10)]}${nums[Math.floor(Math.random() * 10)]}`;
}

// Test scenarios
const testCases = [
  {
    name: "Test 1: Exact Duplicate (Should trigger alert)",
    data: {
      firstName: "Jill",
      lastName: "Dupuis", 
      dateOfBirth: new Date(1954, 3, 21), // 04/21/1954
      phone: "409-626-2734",
      street: "3330 Cleveland Ave",
      city: "Groves",
      state: "TX",
      zipCode: "77619",
      testType: "IMMUNE"
    },
    shouldAlert: true
  },
  {
    name: "Test 2: Partial Match - Same Name, Different DOB (Should trigger alert)",
    data: {
      firstName: "Jennifer",
      lastName: "Duplessis",
      dateOfBirth: new Date(1952, 0, 7), // Different year
      phone: "504-722-5052",
      street: "1714 Southland Ct",
      city: "Baton Rouge", 
      state: "LA",
      zipCode: "70810",
      testType: "IMMUNE"
    },
    shouldAlert: true
  },
  {
    name: "Test 3: Different Person (Should NOT trigger alert)",
    data: {
      firstName: "John",
      lastName: "Smith",
      dateOfBirth: new Date(1980, 5, 15),
      phone: "555-123-4567",
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zipCode: "90210",
      testType: "NEURO"
    },
    shouldAlert: false
  },
  {
    name: "Test 4: Same Name but Very Different Info (Should trigger alert)",
    data: {
      firstName: "George", 
      lastName: "Findley Jr",
      dateOfBirth: new Date(1975, 2, 10), // Very different DOB
      phone: "555-999-8888",
      street: "999 Different St",
      city: "Other City",
      state: "FL", 
      zipCode: "33101",
      testType: "NEURO"
    },
    shouldAlert: true
  }
];

async function checkForDuplicates(client, leadData) {
  // Implementation of duplicate checking logic similar to AlertService
  const duplicateQuery = `
    SELECT id, mbi, "firstName", "lastName", "dateOfBirth", phone, street, city, state, "zipCode"
    FROM "Lead" 
    WHERE LOWER("firstName") = LOWER($1) 
    AND LOWER("lastName") = LOWER($2)
    AND "vendorCode" = 'BASELINE'
    ORDER BY "createdAt" DESC
  `;
  
  const result = await client.query(duplicateQuery, [leadData.firstName, leadData.lastName]);
  
  if (result.rows.length === 0) {
    return { isDuplicate: false, matches: [], allNameMatches: [] };
  }
  
  // Check for exact or close matches
  const matches = result.rows.filter(existing => {
    // Exact DOB match
    if (existing.dateOfBirth.toDateString() === leadData.dateOfBirth.toDateString()) {
      return true;
    }
    
    // Close DOB match (within 2 years)
    const timeDiff = Math.abs(existing.dateOfBirth.getTime() - leadData.dateOfBirth.getTime());
    const yearsDiff = timeDiff / (1000 * 60 * 60 * 24 * 365);
    if (yearsDiff <= 2) {
      return true;
    }
    
    // Phone match
    if (existing.phone && leadData.phone && existing.phone === leadData.phone) {
      return true;
    }
    
    // Address similarity
    if (existing.street && leadData.street && 
        existing.street.toLowerCase().includes(leadData.street.toLowerCase()) ||
        leadData.street.toLowerCase().includes(existing.street.toLowerCase())) {
      return true;
    }
    
    return false;
  });
  
  return {
    isDuplicate: matches.length > 0,
    matches: matches,
    allNameMatches: result.rows
  };
}

async function createAlert(client, leadId, duplicateResult) {
  const alertId = generateId();
  const now = new Date();
  
  const insertAlertQuery = `
    INSERT INTO "LeadAlert" (
      id, "leadId", type, severity, message, "isAcknowledged", 
      "relatedLeadId", metadata, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;
  
  const relatedLeadId = duplicateResult.matches[0]?.id || null;
  const message = duplicateResult.matches.length > 0 
    ? `Potential duplicate found: ${duplicateResult.matches.length} similar record(s) detected`
    : `Name match found: ${(duplicateResult.allNameMatches || []).length} record(s) with same name`;
  
  await client.query(insertAlertQuery, [
    alertId,
    leadId,
    'MBI_DUPLICATE',
    duplicateResult.matches.length > 0 ? 'HIGH' : 'MEDIUM',
    message,
    false,
    relatedLeadId,
    JSON.stringify({
      matchCount: duplicateResult.matches.length,
      totalNameMatches: (duplicateResult.allNameMatches || []).length,
      matchingCriteria: duplicateResult.matches.map(match => ({
        id: match.id,
        mbi: match.mbi,
        name: `${match.firstName} ${match.lastName}`,
        dob: match.dateOfBirth,
        phone: match.phone
      }))
    }),
    now,
    now
  ]);
  
  return alertId;
}

async function runDuplicateDetectionTests() {
  console.log('Starting MBI Alert System Duplicate Detection Tests...\n');
  
  const client = new Client({
    host: databaseConfig.host,
    port: databaseConfig.port,
    database: databaseConfig.database,
    user: databaseConfig.username,
    password: databaseConfig.password,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database\n');
    
    // Get baseline vendor
    const vendorQuery = 'SELECT id FROM "Vendor" WHERE "code" = $1 LIMIT 1';
    const vendorResult = await client.query(vendorQuery, ['BASELINE']);
    const vendorId = vendorResult.rows[0].id;
    
    const testResults = [];
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n=== ${testCase.name} ===`);
      console.log(`Testing: ${testCase.data.firstName} ${testCase.data.lastName}, DOB: ${testCase.data.dateOfBirth.toDateString()}`);
      
      try {
        // Create a test lead
        const leadId = generateId();
        const mbi = generateMBI();
        const now = new Date();
        
        const insertLeadQuery = `
          INSERT INTO "Lead" (
            id, mbi, "firstName", "lastName", "dateOfBirth", phone, street, city, state, "zipCode",
            "vendorId", "vendorCode", status, "testType", "isDuplicate", "hasActiveAlerts",
            "contactAttempts", "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING id
        `;
        
        await client.query(insertLeadQuery, [
          leadId,
          mbi,
          testCase.data.firstName,
          testCase.data.lastName,
          testCase.data.dateOfBirth,
          testCase.data.phone,
          testCase.data.street,
          testCase.data.city,
          testCase.data.state,
          testCase.data.zipCode,
          vendorId,
          'TEST_VENDOR',
          'SUBMITTED',
          testCase.data.testType,
          false,
          false,
          0,
          now,
          now
        ]);
        
        console.log(`✓ Created test lead with MBI: ${mbi}`);
        
        // Check for duplicates
        const duplicateResult = await checkForDuplicates(client, testCase.data);
        
        console.log(`✓ Duplicate check completed:`);
        console.log(`  - Is Duplicate: ${duplicateResult.isDuplicate}`);
        console.log(`  - Exact/Close Matches: ${duplicateResult.matches.length}`);
        console.log(`  - Total Name Matches: ${duplicateResult.allNameMatches.length}`);
        
        if (duplicateResult.matches.length > 0) {
          console.log('  - Matching Records:');
          duplicateResult.matches.forEach((match, idx) => {
            console.log(`    ${idx + 1}. ${match.firstName} ${match.lastName} (${match.dateOfBirth.toDateString()}) - MBI: ${match.mbi}`);
          });
        }
        
        // Create alert if duplicates found
        let alertCreated = false;
        if (duplicateResult.isDuplicate || (duplicateResult.allNameMatches && duplicateResult.allNameMatches.length > 0)) {
          const alertId = await createAlert(client, leadId, duplicateResult);
          console.log(`✓ Alert created with ID: ${alertId}`);
          alertCreated = true;
          
          // Update lead to mark it has alerts
          await client.query(
            'UPDATE "Lead" SET "hasActiveAlerts" = true, "isDuplicate" = $2 WHERE id = $1',
            [leadId, duplicateResult.isDuplicate]
          );
        }
        
        // Verify test expectation
        const expectedAlert = testCase.shouldAlert;
        const actualAlert = alertCreated;
        
        const testPassed = expectedAlert === actualAlert;
        
        console.log(`\n✓ Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`  Expected Alert: ${expectedAlert}, Actual Alert: ${actualAlert}`);
        
        testResults.push({
          name: testCase.name,
          passed: testPassed,
          expected: expectedAlert,
          actual: actualAlert,
          matchCount: duplicateResult.matches.length,
          nameMatchCount: duplicateResult.allNameMatches.length
        });
        
      } catch (error) {
        console.error(`❌ Test failed with error: ${error.message}`);
        testResults.push({
          name: testCase.name,
          passed: false,
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('DUPLICATE DETECTION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    
    console.log(`\nOverall Results: ${passedTests}/${totalTests} tests passed\n`);
    
    testResults.forEach((result, idx) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${idx + 1}. ${status} - ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      } else if (!result.passed) {
        console.log(`   Expected: ${result.expected}, Got: ${result.actual}`);
      }
    });
    
    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! MBI Alert System is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the duplicate detection logic.');
    }
    
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    await client.end();
  }
}

// Run the tests
runDuplicateDetectionTests(); 