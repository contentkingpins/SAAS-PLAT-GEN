import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { WSEvent } from '@/types';

const prisma = new PrismaClient();

export interface AlertEvent {
  type: 'mbi_duplicate_alert' | 'compliance_alert' | 'data_quality_alert';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  leadId: string;
  vendorId: string;
  message: string;
  metadata: any;
  timestamp: Date;
}

export interface DashboardUpdate {
  type: 'metrics_update' | 'lead_status_change' | 'new_lead_submitted';
  data: any;
  timestamp: Date;
}

class WebSocketServer {
  private io: SocketIOServer | null = null;
  private httpServer: any = null;
  private connectedClients: Map<string, any> = new Map();
  private roomSubscriptions: Map<string, Set<string>> = new Map();

  constructor() {
    this.setupServer();
  }

  private setupServer() {
    // Create HTTP server for Socket.IO
    this.httpServer = createServer();
    
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: "*", // Configure based on your domain
        methods: ["GET", "POST"]
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Store client connection
      this.connectedClients.set(socket.id, {
        socketId: socket.id,
        userId: null,
        userRole: null,
        vendorId: null,
        connectedAt: new Date()
      });

      // Handle authentication
      socket.on('authenticate', async (data) => {
        await this.handleAuthentication(socket, data);
      });

      // Handle room joining for role-based updates
      socket.on('join_room', (data) => {
        this.handleJoinRoom(socket, data.room);
      });

      socket.on('leave_room', (data) => {
        this.handleLeaveRoom(socket, data.room);
      });

      // Handle lead subscriptions
      socket.on('subscribe_lead', (data) => {
        this.handleLeadSubscription(socket, data.leadId);
      });

      socket.on('unsubscribe_lead', (data) => {
        this.handleLeadUnsubscription(socket, data.leadId);
      });

      // Handle metrics requests
      socket.on('request_metrics', async (data) => {
        await this.handleMetricsRequest(socket, data);
      });

      // Handle MBI alert acknowledgment
      socket.on('acknowledge_alert', async (data) => {
        await this.handleAlertAcknowledgment(socket, data);
      });

      // Handle bulk duplicate check requests
      socket.on('request_bulk_duplicate_check', async (data) => {
        await this.handleBulkDuplicateCheck(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        this.handleDisconnection(socket);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'Connected to MBI Alert System WebSocket',
        timestamp: new Date(),
        socketId: socket.id
      });
    });
  }

  private async handleAuthentication(socket: any, data: any) {
    try {
      const { token, userId, userRole, vendorId } = data;
      
      // Here you would validate the token
      // For now, we'll accept the provided data
      
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.userId = userId;
        clientInfo.userRole = userRole;
        clientInfo.vendorId = vendorId;
        this.connectedClients.set(socket.id, clientInfo);
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

      console.log(`Client ${socket.id} authenticated as ${userRole}`);
    } catch (error) {
      socket.emit('authentication_error', {
        error: 'Authentication failed',
        timestamp: new Date()
      });
    }
  }

  private handleJoinRoom(socket: any, room: string) {
    socket.join(room);
    
    if (!this.roomSubscriptions.has(room)) {
      this.roomSubscriptions.set(room, new Set());
    }
    this.roomSubscriptions.get(room)?.add(socket.id);

    console.log(`Client ${socket.id} joined room: ${room}`);
    socket.emit('room_joined', { room, timestamp: new Date() });
  }

  private handleLeaveRoom(socket: any, room: string) {
    socket.leave(room);
    this.roomSubscriptions.get(room)?.delete(socket.id);

    console.log(`Client ${socket.id} left room: ${room}`);
    socket.emit('room_left', { room, timestamp: new Date() });
  }

  private handleLeadSubscription(socket: any, leadId: string) {
    const room = `lead_${leadId}`;
    this.handleJoinRoom(socket, room);
  }

  private handleLeadUnsubscription(socket: any, leadId: string) {
    const room = `lead_${leadId}`;
    this.handleLeaveRoom(socket, room);
  }

  private async handleMetricsRequest(socket: any, data: any) {
    try {
      const { range = 'day' } = data;
      const metrics = await this.getDashboardMetrics(range);
      
      socket.emit('metrics_data', {
        metrics,
        range,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('metrics_error', {
        error: 'Failed to fetch metrics',
        timestamp: new Date()
      });
    }
  }

  private async handleAlertAcknowledgment(socket: any, data: any) {
    try {
      const { alertId, acknowledgingUserId } = data;
      
      // Update alert in database
      await prisma.leadAlert.update({
        where: { id: alertId },
        data: {
          isAcknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: acknowledgingUserId
        }
      });

      // Broadcast acknowledgment to relevant rooms
      this.broadcastAlertAcknowledgment(alertId, acknowledgingUserId);
      
      socket.emit('alert_acknowledged', {
        alertId,
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('alert_acknowledgment_error', {
        error: 'Failed to acknowledge alert',
        timestamp: new Date()
      });
    }
  }

  private async handleBulkDuplicateCheck(socket: any, data: any) {
    try {
      const { vendorId } = data;
      
      // Start bulk duplicate check process
      socket.emit('bulk_check_started', {
        message: 'Bulk duplicate check started',
        timestamp: new Date()
      });

      // This would be a background process
      // For now, we'll simulate the progress
      let processed = 0;
      const total = 100; // Simulated total

      const interval = setInterval(() => {
        processed += 10;
        
        socket.emit('bulk_check_progress', {
          processed,
          total,
          percentage: Math.round((processed / total) * 100),
          timestamp: new Date()
        });

        if (processed >= total) {
          clearInterval(interval);
          socket.emit('bulk_check_completed', {
            processed,
            duplicatesFound: 5, // Simulated
            timestamp: new Date()
          });
        }
      }, 1000);

    } catch (error) {
      socket.emit('bulk_check_error', {
        error: 'Failed to start bulk duplicate check',
        timestamp: new Date()
      });
    }
  }

  private handleDisconnection(socket: any) {
    // Clean up client data
    this.connectedClients.delete(socket.id);
    
    // Clean up room subscriptions
    this.roomSubscriptions.forEach((sockets, room) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    });
  }

  // Public methods for broadcasting events

  public broadcastMBIAlert(alert: AlertEvent) {
    if (!this.io) return;

    console.log(`Broadcasting MBI Alert: ${alert.type} for lead ${alert.leadId}`);

    // Broadcast to admin room
    this.io.to('admin').emit('mbi_alert', {
      ...alert,
      timestamp: new Date()
    });

    // Broadcast to vendor room if applicable
    if (alert.vendorId) {
      this.io.to(`vendor_${alert.vendorId}`).emit('mbi_alert', {
        ...alert,
        timestamp: new Date()
      });
    }

    // Broadcast to advocates room
    this.io.to('advocates').emit('mbi_alert', {
      ...alert,
      timestamp: new Date()
    });

    // Broadcast to specific lead room
    this.io.to(`lead_${alert.leadId}`).emit('lead_alert', {
      ...alert,
      timestamp: new Date()
    });
  }

  public broadcastDashboardUpdate(update: DashboardUpdate) {
    if (!this.io) return;

    console.log(`Broadcasting Dashboard Update: ${update.type}`);

    // Broadcast to metrics room
    this.io.to('metrics').emit('dashboard_update', {
      ...update,
      timestamp: new Date()
    });

    // Broadcast to admin room
    this.io.to('admin').emit('dashboard_update', {
      ...update,
      timestamp: new Date()
    });
  }

  public broadcastLeadUpdate(leadId: string, update: any) {
    if (!this.io) return;

    console.log(`Broadcasting Lead Update for lead: ${leadId}`);

    // Broadcast to specific lead room
    this.io.to(`lead_${leadId}`).emit('lead_updated', {
      leadId,
      update,
      timestamp: new Date()
    });

    // Broadcast to admin room
    this.io.to('admin').emit('lead_updated', {
      leadId,
      update,
      timestamp: new Date()
    });
  }

  private broadcastAlertAcknowledgment(alertId: string, acknowledgingUserId: string) {
    if (!this.io) return;

    this.io.to('alerts').emit('alert_acknowledged', {
      alertId,
      acknowledgingUserId,
      timestamp: new Date()
    });
  }

  public broadcastNewLead(lead: any) {
    if (!this.io) return;

    console.log(`Broadcasting New Lead: ${lead.id}`);

    // Broadcast to admin room
    this.io.to('admin').emit('new_lead', {
      lead,
      timestamp: new Date()
    });

    // Broadcast to vendor room
    if (lead.vendorId) {
      this.io.to(`vendor_${lead.vendorId}`).emit('new_lead', {
        lead,
        timestamp: new Date()
      });
    }
  }

  private async getDashboardMetrics(range: string) {
    // This would fetch real metrics from the database
    // For now, returning mock data
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    try {
      const totalLeads = await prisma.lead.count();
      const leadsInRange = await prisma.lead.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      });

      const activeAlerts = await prisma.leadAlert.count({
        where: {
          isAcknowledged: false
        }
      });

      return {
        totalLeads,
        leadsInRange,
        activeAlerts,
        conversionRate: 0.25, // Mock
        duplicatesDetected: 12, // Mock
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return {
        totalLeads: 0,
        leadsInRange: 0,
        activeAlerts: 0,
        conversionRate: 0,
        duplicatesDetected: 0,
        lastUpdated: new Date()
      };
    }
  }

  public getConnectedClients() {
    return Array.from(this.connectedClients.values());
  }

  public getServerStats() {
    return {
      connectedClients: this.connectedClients.size,
      activeRooms: this.roomSubscriptions.size,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }

  public start(port: number = 3001) {
    if (this.httpServer) {
      this.httpServer.listen(port, () => {
        console.log(`🚀 WebSocket Server running on port ${port}`);
        console.log(`📡 Real-time MBI Alert System is operational`);
      });
    }
  }

  public stop() {
    if (this.io) {
      this.io.close();
    }
    if (this.httpServer) {
      this.httpServer.close();
    }
    console.log('WebSocket Server stopped');
  }
}

// Export singleton instance
export const wsServer = new WebSocketServer();

// Helper function to be used from API routes
export function notifyMBIAlert(alert: AlertEvent) {
  wsServer.broadcastMBIAlert(alert);
}

export function notifyDashboardUpdate(update: DashboardUpdate) {
  wsServer.broadcastDashboardUpdate(update);
}

export function notifyLeadUpdate(leadId: string, update: any) {
  wsServer.broadcastLeadUpdate(leadId, update);
}

export function notifyNewLead(lead: any) {
  wsServer.broadcastNewLead(lead);
} 