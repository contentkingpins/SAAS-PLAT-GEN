const fetch = require('node-fetch');

async function testAuthFlow() {
  console.log('🔄 Testing authentication flow...\n');
  
  // Step 1: Login to get token
  console.log('Step 1: Logging in as admin...');
  const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@healthcare.com',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed:', loginResponse.status, await loginResponse.text());
    return;
  }

  const loginData = await loginResponse.json();
  if (!loginData.success || !loginData.token) {
    console.log('❌ Login response invalid:', loginData);
    return;
  }

  console.log('✅ Login successful! Token length:', loginData.token.length);
  console.log('👤 User:', loginData.user.email, 'Role:', loginData.user.role);

  // Step 2: Test batch processing endpoint
  console.log('\nStep 2: Testing batch processing endpoint...');
  const batchResponse = await fetch('http://localhost:3004/api/admin/uploads/batch/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      uploadType: 'SHIPPING_REPORT',
      fileName: 'test.csv',
      fileContent: 'dGVzdCBjc3YgY29udGVudA==' // "test csv content" in base64
    })
  });

  console.log('📡 Batch endpoint response status:', batchResponse.status);
  
  if (!batchResponse.ok) {
    const errorText = await batchResponse.text();
    console.log('❌ Batch endpoint failed:', errorText);
  } else {
    const batchData = await batchResponse.json();
    console.log('✅ Batch endpoint success:', batchData);
  }

  // Step 3: Test batch status endpoint
  console.log('\nStep 3: Testing batch status endpoint...');
  const statusResponse = await fetch('http://localhost:3004/api/admin/uploads/batch/status/test-id', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${loginData.token}`
    }
  });

  console.log('📡 Status endpoint response status:', statusResponse.status);
  
  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    console.log('❌ Status endpoint failed:', errorText);
  } else {
    const statusData = await statusResponse.json();
    console.log('✅ Status endpoint success:', statusData);
  }
}

// Run the test
testAuthFlow().catch(console.error); 