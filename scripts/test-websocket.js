const { io } = require('socket.io-client');

console.log('🧪 Testing WebSocket MBI Alert System...\n');

// Test connection to WebSocket server
const socket = io('http://localhost:3001', {
  reconnection: true,
  timeout: 5000
});

let testResults = {
  connection: false,
  authentication: false,
  alertReceived: false,
  metricsReceived: false
};

// Connection test
socket.on('connect', () => {
  console.log('✅ Connection test PASSED');
  testResults.connection = true;
  
  console.log('🔐 Testing authentication...');
  socket.emit('authenticate', {
    userId: 'test-user',
    userRole: 'admin',
    vendorId: null
  });
});

// Authentication test
socket.on('authenticated', (data) => {
  console.log('✅ Authentication test PASSED');
  console.log(`   Rooms joined: ${data.rooms.join(', ')}`);
  testResults.authentication = true;
  
  setTimeout(() => {
    console.log('📊 Testing metrics request...');
    socket.emit('request_metrics', { range: 'day' });
  }, 1000);
  
  setTimeout(() => {
    console.log('🔍 Testing bulk duplicate check...');
    socket.emit('request_bulk_duplicate_check', { vendorId: 'test' });
  }, 2000);
});

// Metrics test
socket.on('metrics_data', (data) => {
  console.log('✅ Metrics test PASSED');
  console.log('   Received metrics:', {
    totalLeads: data.metrics.totalLeads,
    activeAlerts: data.metrics.activeAlerts,
    duplicatesDetected: data.metrics.duplicatesDetected
  });
  testResults.metricsReceived = true;
});

// Alert broadcasting test
socket.on('mbi_alert', (alert) => {
  console.log('✅ Alert reception test PASSED');
  console.log('   Alert details:', {
    type: alert.type,
    severity: alert.severity,
    leadId: alert.leadId,
    message: alert.message.substring(0, 50) + '...'
  });
  testResults.alertReceived = true;
});

// Bulk check progress test
socket.on('bulk_check_started', (data) => {
  console.log('✅ Bulk check started');
});

socket.on('bulk_check_progress', (progress) => {
  console.log(`📈 Bulk check progress: ${progress.percentage}%`);
});

socket.on('bulk_check_completed', (data) => {
  console.log('✅ Bulk check completed');
  console.log(`   Processed: ${data.processed}, Duplicates found: ${data.duplicatesFound}`);
});

// Server stats test
socket.on('server_stats', (stats) => {
  console.log('📊 Server stats received:', {
    connectedClients: stats.connectedClients,
    activeRooms: stats.activeRooms,
    uptime: Math.round(stats.uptime) + 's'
  });
});

// Connection error handling
socket.on('connect_error', (error) => {
  console.log('❌ Connection test FAILED');
  console.log('   Error:', error.message);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});

// Simulate creating a duplicate alert after 3 seconds
setTimeout(() => {
  console.log('\n🚨 Simulating MBI duplicate alert...');
  
  // Test the global broadcast function if available
  if (global.broadcastMBIAlert) {
    global.broadcastMBIAlert({
      type: 'mbi_duplicate_alert',
      severity: 'HIGH',
      leadId: 'test-lead-123',
      vendorId: 'test-vendor',
      message: 'Test duplicate alert: John Doe matches existing patient',
      metadata: {
        duplicateLeadId: 'existing-lead-456',
        matchingCriteria: ['exact name and date of birth', 'phone number']
      },
      timestamp: new Date()
    });
  } else {
    console.log('   Note: Global broadcast function not available (normal in test mode)');
  }
}, 3000);

// Test summary after 8 seconds
setTimeout(() => {
  console.log('\n📋 Test Summary:');
  console.log('================');
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} - ${testName}`);
  });
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All WebSocket tests passed! System is operational.');
  } else {
    console.log('⚠️  Some tests failed. Check WebSocket server status.');
  }
  
  socket.disconnect();
  process.exit(0);
}, 8000);

console.log('⏳ Running tests for 8 seconds...\n'); 