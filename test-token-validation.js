const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

async function testTokenValidation() {
  console.log('🔍 Testing JWT token validation...\n');
  
  // Step 1: Login and get token
  console.log('Step 1: Getting JWT token from login...');
  const loginResponse = await fetch('http://localhost:3004/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@healthcare.com',
      password: 'admin123'
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed');
    return;
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  console.log('✅ Token received, length:', token.length);
  console.log('🔍 Token preview:', token.substring(0, 50) + '...');

  // Step 2: Decode the token locally to see what's in it
  console.log('\nStep 2: Decoding JWT token locally...');
  try {
    // Decode without verification first to see the payload
    const decoded = jwt.decode(token);
    console.log('📄 Token payload:', decoded);
    
    // Try to verify with the same secret used in login
    const verified = jwt.verify(token, 'healthcare-platform-jwt-secret-2024');
    console.log('✅ Local verification successful');
  } catch (error) {
    console.log('❌ Local token verification failed:', error.message);
  }

  // Step 3: Test a simple admin endpoint that should work
  console.log('\nStep 3: Testing simple admin endpoint...');
  const simpleResponse = await fetch('http://localhost:3004/api/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('📡 Simple admin endpoint status:', simpleResponse.status);
  if (!simpleResponse.ok) {
    const errorText = await simpleResponse.text();
    console.log('❌ Simple endpoint failed:', errorText);
  } else {
    console.log('✅ Simple admin endpoint works');
  }

  // Step 4: Test batch endpoint with exact same token
  console.log('\nStep 4: Testing batch endpoint with same token...');
  const batchResponse = await fetch('http://localhost:3004/api/admin/uploads/batch/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      uploadType: 'SHIPPING_REPORT',
      fileName: 'test.csv',
      fileContent: 'dGVzdA==' // "test" in base64
    })
  });

  console.log('📡 Batch endpoint status:', batchResponse.status);
  if (!batchResponse.ok) {
    const errorText = await batchResponse.text();
    console.log('❌ Batch endpoint failed:', errorText);
  } else {
    console.log('✅ Batch endpoint works');
  }

  // Step 5: Test if middleware is seeing the headers at all
  console.log('\nStep 5: Testing headers visibility...');
  console.log('🔍 Authorization header being sent:', `Bearer ${token.substring(0, 20)}...`);
}

testTokenValidation().catch(console.error); 