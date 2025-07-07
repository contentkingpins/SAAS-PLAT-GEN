#!/usr/bin/env node

/**
 * UPS Webhook Testing Script
 * Tests the webhook endpoint with various tracking event scenarios
 */

const https = require('https');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'https://saasplat.amplifyapp.com',
  webhookPath: '/api/webhooks/ups-tracking',
  credential: '1c60fc19395ace28204f84d7096d09d0386103644cf414cf6e3787c8060d909d'
};

// Test scenarios with real tracking numbers from production data
const TEST_SCENARIOS = [
  {
    name: 'Package Delivered',
    payload: {
      trackingNumber: '1ZJ226530141817078',
      localActivityDate: '20241201',
      localActivityTime: '143000',
      activityLocation: {
        city: 'The Villages',
        stateProvince: 'FL',
        postalCode: '32159',
        countryCode: 'US'
      },
      activityStatus: {
        type: 'D',
        code: '008',
        description: 'DELIVERED'
      },
      actualDeliveryDate: '20241201',
      actualDeliveryTime: '143000'
    }
  },
  {
    name: 'Out for Delivery',
    payload: {
      trackingNumber: '1ZJ226530141784087',
      localActivityDate: '20241201',
      localActivityTime: '080000',
      activityLocation: {
        city: 'Bastian',
        stateProvince: 'VA',
        postalCode: '24314',
        countryCode: 'US'
      },
      activityStatus: {
        type: 'I',
        code: '009',
        description: 'OUT FOR DELIVERY'
      },
      scheduledDeliveryDate: '20241201',
      scheduledDeliveryTime: '170000'
    }
  },
  {
    name: 'Exception - Customer Not Available',
    payload: {
      trackingNumber: '1ZJ226530141817078',
      localActivityDate: '20241130',
      localActivityTime: '160000',
      activityLocation: {
        city: 'The Villages',
        stateProvince: 'FL',
        postalCode: '32159',
        countryCode: 'US'
      },
      activityStatus: {
        type: 'X',
        code: '004',
        description: 'DELIVERY ATTEMPT - CUSTOMER NOT AVAILABLE'
      },
      scheduledDeliveryDate: '20241201',
      scheduledDeliveryTime: '170000'
    }
  },
  {
    name: 'Package in Transit',
    payload: {
      trackingNumber: '1ZJ226530141784087',
      localActivityDate: '20241130',
      localActivityTime: '120000',
      activityLocation: {
        city: 'Atlanta',
        stateProvince: 'GA',
        postalCode: '30309',
        countryCode: 'US'
      },
      activityStatus: {
        type: 'I',
        code: '003',
        description: 'DEPARTURE SCAN'
      }
    }
  }
];

console.log('🧪 UPS Webhook Testing Started...\n');

async function testWebhook(scenario) {
  console.log(`📦 Testing: ${scenario.name}`);
  
  try {
    const response = await makeRequest('POST', CONFIG.webhookPath, {
      'UPS-Webhook-Credential': CONFIG.credential,
      'Content-Type': 'application/json'
    }, scenario.payload);
    
    console.log(`   📊 Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('   ✅ Result: SUCCESS');
      
      try {
        const responseData = JSON.parse(response.body);
        if (responseData.leadId) {
          console.log(`   🎯 Lead ID: ${responseData.leadId}`);
        }
        if (responseData.statusUpdated) {
          console.log(`   📈 Status Updated: ${responseData.statusUpdated}`);
        }
      } catch (e) {
        console.log('   📝 Response: Success (no JSON body)');
      }
    } else {
      console.log('   ❌ Result: FAILED');
      console.log(`   📝 Response: ${response.body.substring(0, 200)}...`);
    }
    
  } catch (error) {
    console.log('   ❌ Result: ERROR');
    console.log(`   💥 Error: ${error.message}`);
  }
  
  console.log('');
}

async function testAllScenarios() {
  console.log(`🎯 Running ${TEST_SCENARIOS.length} webhook test scenarios...\n`);
  
  let successCount = 0;
  
  for (const scenario of TEST_SCENARIOS) {
    await testWebhook(scenario);
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('📊 WEBHOOK TEST SUMMARY');
  console.log('======================');
  console.log(`Tests run: ${TEST_SCENARIOS.length}`);
  console.log(`Endpoint: ${CONFIG.baseUrl}${CONFIG.webhookPath}`);
  console.log(`Credential: ${CONFIG.credential.substring(0, 16)}...`);
}

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.baseUrl);
    const options = {
      method,
      headers,
      timeout: 10000
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    
    req.end();
  });
}

// Generate test data file
function generateTestDataFile() {
  const testData = {
    webhook_url: `${CONFIG.baseUrl}${CONFIG.webhookPath}`,
    credential: CONFIG.credential,
    test_scenarios: TEST_SCENARIOS
  };
  
  fs.writeFileSync('webhook-test-data.json', JSON.stringify(testData, null, 2));
  console.log('💾 Generated webhook-test-data.json for external testing\n');
}

// Main execution
async function main() {
  try {
    generateTestDataFile();
    await testAllScenarios();
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Ensure UPS environment variables are set in AWS Amplify');
    console.log('2. Configure UPS webhook subscription to point to this endpoint');
    console.log('3. Test with real shipping events from UPS Developer Kit');
    
  } catch (error) {
    console.error('💥 Webhook testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, TEST_SCENARIOS, CONFIG }; 