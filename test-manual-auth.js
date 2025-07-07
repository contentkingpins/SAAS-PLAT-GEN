const fetch = require('node-fetch');

async function testManualAuth() {
  console.log('🔄 Testing manual JWT verification in batch endpoint...\n');
  
  // Step 1: Login
  console.log('Step 1: Getting JWT token...');
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
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

  // Step 2: Test batch endpoint with manual auth
  console.log('\nStep 2: Testing batch endpoint with manual JWT verification...');
  const batchResponse = await fetch('http://localhost:3000/api/admin/uploads/batch/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      uploadType: 'SHIPPING_REPORT',
      fileName: 'test.csv',
      fileContent: 'bmFtZSx0cmFja2luZ251bWJlcgpKb2huIERvZSwxMjM0NTY3ODkwCkphbmUgU21pdGgsMDk4NzY1NDMyMQ==' // Valid CSV in base64
    })
  });

  console.log('📡 Batch endpoint status:', batchResponse.status);
  
  if (!batchResponse.ok) {
    const errorText = await batchResponse.text();
    console.log('❌ Batch endpoint failed:', errorText);
  } else {
    const responseData = await batchResponse.json();
    console.log('✅ Batch endpoint success:', responseData);
  }
}

testManualAuth().catch(console.error); 