import io from 'socket.io-client';

class WebSocketService {
  private socket: any | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();
  private store: any = { setConnected: () => {}, updateLead: () => {}, addLead: () => {}, setMetrics: () => {} };

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    const wsEndpoint = process.env.NEXT_PUBLIC_WS_ENDPOINT || 'ws://localhost:3001';
    
    this.socket = io(wsEndpoint, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.store.setConnected(true);
      this.clearReconnectInterval();
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.store.setConnected(false);
      this.attemptReconnect();
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('WebSocket connection error:', error);
      this.store.setConnected(false);
    });

    // Business event listeners
    this.socket.on('lead_updated', (data: any) => {
      this.emit('lead_updated', data);
      // Using placeholder store
      this.store.updateLead(data.leadId, data.updates);
    });

    this.socket.on('new_lead', (data: any) => {
      this.emit('new_lead', data);
      // Using placeholder store
      this.store.addLead(data.lead);
    });

    this.socket.on('metric_update', (data: any) => {
      this.emit('metric_update', data);
      // Using placeholder store
      this.store.setMetrics(data.metrics);
    });

    this.socket.on('agent_status', (data: any) => {
      this.emit('agent_status', data);
    });
  }

  private attemptReconnect() {
    if (this.reconnectInterval) return;

    this.reconnectInterval = setInterval(() => {
      if (!this.socket?.connected) {
        console.log('Attempting to reconnect...');
        this.connect();
      }
    }, 5000);
  }

  private clearReconnectInterval() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  disconnect() {
    this.clearReconnectInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.store.setConnected(false);
  }

  // Event subscription
  on(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  // Event emission
  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Send message to server
  send(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected. Message not sent:', event);
    }
  }

  // Join a room (for role-based updates)
  joinRoom(room: string) {
    this.send('join_room', { room });
  }

  // Leave a room
  leaveRoom(room: string) {
    this.send('leave_room', { room });
  }

  // Request real-time metrics
  requestMetrics(range: 'day' | 'week' | 'month') {
    this.send('request_metrics', { range });
  }

  // Subscribe to lead updates
  subscribeLead(leadId: string) {
    this.send('subscribe_lead', { leadId });
  }

  // Unsubscribe from lead updates
  unsubscribeLead(leadId: string) {
    this.send('unsubscribe_lead', { leadId });
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

// React hook for WebSocket
export function useWebSocket() {
  // const isConnected = false; // Placeholder

  const subscribe = (event: string, handler: (data: any) => void) => {
    const unsubscribe = wsService.on(event, handler);
    return unsubscribe;
  };

  return {
    isConnected: false,
    subscribe,
    send: wsService.send.bind(wsService),
    joinRoom: wsService.joinRoom.bind(wsService),
    leaveRoom: wsService.leaveRoom.bind(wsService),
    requestMetrics: wsService.requestMetrics.bind(wsService),
    subscribeLead: wsService.subscribeLead.bind(wsService),
    unsubscribeLead: wsService.unsubscribeLead.bind(wsService),
  };
} 