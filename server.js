const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
const wsPort = process.env.WS_PORT || 3001;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server for Next.js
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Start Next.js server
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js ready on http://${hostname}:${port}`);
  });

  // Start WebSocket server on separate port
  startWebSocketServer();
});

function startWebSocketServer() {
  // Create separate HTTP server for WebSocket
  const wsServer = createServer();
  
  const io = new Server(wsServer, {
    cors: {
      origin: [`http://localhost:${port}`, "https://*.amplifyapp.com"], 
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Connected clients tracking
  const connectedClients = new Map();
  const roomSubscriptions = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Store client connection
    connectedClients.set(socket.id, {
      socketId: socket.id,
      userId: null,
      userRole: null,
      vendorId: null,
      connectedAt: new Date()
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Healthcare Lead Platform WebSocket',
      socketId: socket.id,
      timestamp: new Date()
    });

    // Handle authentication
    socket.on('authenticate', (data) => {
      const { userId, userRole, vendorId } = data;
      
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.userId = userId;
        clientInfo.userRole = userRole;
        clientInfo.vendorId = vendorId;
        connectedClients.set(socket.id, clientInfo);
      }

      // Join appropriate rooms based on role
      if (userRole === 'admin') {
        socket.join('admin');
        socket.join('alerts');
        socket.join('metrics');
      } else if (userRole === 'vendor') {
        socket.join(`vendor_${vendorId}`);
        socket.join('alerts');
      } else if (userRole === 'advocate') {
        socket.join('advocates');
        socket.join('alerts');
      }

      socket.emit('authenticated', {
        success: true,
        rooms: Array.from(socket.rooms),
        timestamp: new Date()
      });

      console.log(`✅ Client ${socket.id} authenticated as ${userRole}`);
    });

    // Handle room management
    socket.on('join_room', (data) => {
      const { room } = data;
      socket.join(room);
      
      if (!roomSubscriptions.has(room)) {
        roomSubscriptions.set(room, new Set());
      }
      roomSubscriptions.get(room).add(socket.id);

      socket.emit('room_joined', { room, timestamp: new Date() });
      console.log(`🏠 Client ${socket.id} joined room: ${room}`);
    });

    socket.on('leave_room', (data) => {
      const { room } = data;
      socket.leave(room);
      roomSubscriptions.get(room)?.delete(socket.id);

      socket.emit('room_left', { room, timestamp: new Date() });
      console.log(`🚪 Client ${socket.id} left room: ${room}`);
    });

    // Handle lead subscriptions
    socket.on('subscribe_lead', (data) => {
      const { leadId } = data;
      const room = `lead_${leadId}`;
      socket.join(room);
      console.log(`📋 Client ${socket.id} subscribed to lead: ${leadId}`);
    });

    socket.on('unsubscribe_lead', (data) => {
      const { leadId } = data;
      const room = `lead_${leadId}`;
      socket.leave(room);
      console.log(`📋 Client ${socket.id} unsubscribed from lead: ${leadId}`);
    });

    // Handle metrics requests
    socket.on('request_metrics', (data) => {
      const { range = 'day' } = data;
      
      // Mock metrics data
      const metrics = {
        totalLeads: Math.floor(Math.random() * 1000) + 500,
        leadsToday: Math.floor(Math.random() * 50) + 10,
        activeAlerts: Math.floor(Math.random() * 15) + 3,
        conversionRate: (Math.random() * 0.3 + 0.15).toFixed(2),
        duplicatesDetected: Math.floor(Math.random() * 20) + 5,
        lastUpdated: new Date()
      };

      socket.emit('metrics_data', {
        metrics,
        range,
        timestamp: new Date()
      });
    });

    // Handle alert acknowledgment
    socket.on('acknowledge_alert', async (data) => {
      const { alertId, userId } = data;
      
      // Broadcast acknowledgment to relevant rooms
      io.to('alerts').emit('alert_acknowledged', {
        alertId,
        acknowledgedBy: userId,
        timestamp: new Date()
      });

      socket.emit('alert_acknowledged', {
        alertId,
        timestamp: new Date()
      });

      console.log(`🔔 Alert ${alertId} acknowledged by user ${userId}`);
    });

    // Handle bulk duplicate check
    socket.on('request_bulk_duplicate_check', (data) => {
      const { vendorId } = data;
      
      socket.emit('bulk_check_started', {
        message: 'Bulk duplicate check started',
        timestamp: new Date()
      });

      // Simulate progress
      let processed = 0;
      const total = 100;

      const interval = setInterval(() => {
        processed += Math.floor(Math.random() * 15) + 5;
        
        if (processed >= total) {
          processed = total;
          clearInterval(interval);
          
          socket.emit('bulk_check_completed', {
            processed,
            total,
            duplicatesFound: Math.floor(Math.random() * 8) + 2,
            timestamp: new Date()
          });
        } else {
          socket.emit('bulk_check_progress', {
            processed,
            total,
            percentage: Math.round((processed / total) * 100),
            timestamp: new Date()
          });
        }
      }, 1000);

      console.log(`🔍 Bulk duplicate check started for vendor: ${vendorId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
      
      // Clean up
      connectedClients.delete(socket.id);
      roomSubscriptions.forEach((sockets, room) => {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          roomSubscriptions.delete(room);
        }
      });
    });
  });

  // Broadcast functions for external use
  global.broadcastMBIAlert = (alert) => {
    console.log(`🚨 Broadcasting MBI Alert: ${alert.type} for lead ${alert.leadId}`);
    
    io.to('admin').emit('mbi_alert', { ...alert, timestamp: new Date() });
    io.to('alerts').emit('mbi_alert', { ...alert, timestamp: new Date() });
    
    if (alert.vendorId) {
      io.to(`vendor_${alert.vendorId}`).emit('mbi_alert', { ...alert, timestamp: new Date() });
    }
    
    io.to(`lead_${alert.leadId}`).emit('lead_alert', { ...alert, timestamp: new Date() });
  };

  global.broadcastLeadUpdate = (leadId, update) => {
    console.log(`📈 Broadcasting Lead Update for lead: ${leadId}`);
    
    io.to(`lead_${leadId}`).emit('lead_updated', {
      leadId,
      update,
      timestamp: new Date()
    });
    
    io.to('admin').emit('lead_updated', {
      leadId,
      update,
      timestamp: new Date()
    });
  };

  global.broadcastNewLead = (lead) => {
    console.log(`📋 Broadcasting New Lead: ${lead.id}`);
    
    io.to('admin').emit('new_lead', { lead, timestamp: new Date() });
    
    if (lead.vendorId) {
      io.to(`vendor_${lead.vendorId}`).emit('new_lead', { lead, timestamp: new Date() });
    }
  };

  global.broadcastDashboardUpdate = (update) => {
    console.log(`📊 Broadcasting Dashboard Update: ${update.type}`);
    
    io.to('metrics').emit('dashboard_update', { ...update, timestamp: new Date() });
    io.to('admin').emit('dashboard_update', { ...update, timestamp: new Date() });
  };

  // Start WebSocket server
  wsServer.listen(wsPort, () => {
    console.log(`🚀 WebSocket Server running on port ${wsPort}`);
    console.log(`📡 Real-time MBI Alert System is operational`);
    console.log(`🔗 CORS enabled for localhost:${port} and Amplify domains`);
  });

  // Periodic server stats broadcast
  setInterval(() => {
    const stats = {
      connectedClients: connectedClients.size,
      activeRooms: roomSubscriptions.size,
      uptime: process.uptime(),
      timestamp: new Date()
    };
    
    io.to('admin').emit('server_stats', stats);
  }, 30000); // Every 30 seconds

  return { io, wsServer };
} 