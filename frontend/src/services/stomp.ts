import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

type MessageCallback = (message: any) => void;

class StompService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private pendingSubscriptions: Map<string, MessageCallback[]> = new Map();
  private connected: boolean = false;
  private heartbeatInterval: any = null;
  private messageQueue: { destination: string; body: any }[] = [];

  public connect(token: string) {
    if (this.client && this.connected) return;

    const wsBaseUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_BASE_URL;
    const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
    let brokerUrl: string;

    if (wsBaseUrl) {
      brokerUrl = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl.replace(/\/+$/, '')}/ws`;
    } else if (apiBaseUrl) {
      const cleanApi = apiBaseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
      const wsProtocol = cleanApi.startsWith('https') ? 'wss' : 'ws';
      const cleanHost = cleanApi.replace(/^https?:\/\//, '');
      brokerUrl = `${wsProtocol}://${cleanHost}/ws`;
    } else if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      brokerUrl = 'wss://samvaad-l9lg.onrender.com/ws';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      brokerUrl = `${protocol}//${window.location.host}/ws`;
    }

    this.client = new Client({
      brokerURL: brokerUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (_str) => {
        // debug logging can be enabled when troubleshooting
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      this.connected = true;
      console.log('[STOMP] Connected successfully');

      // Start presence heartbeat ping
      this.startHeartbeat();

      // Subscribe to personal queue
      this.subscribeToPrivateQueue();

      // Process any pending subscriptions
      this.pendingSubscriptions.forEach((callbacks, destination) => {
        callbacks.forEach((cb) => this.subscribe(destination, cb));
      });
      this.pendingSubscriptions.clear();

      // Flush any queued outgoing messages/signals
      while (this.messageQueue.length > 0) {
        const item = this.messageQueue.shift();
        if (item && this.client) {
          try {
            this.client.publish({
              destination: item.destination,
              body: JSON.stringify(item.body),
            });
          } catch (qErr) {
            console.error('[STOMP] Error flushing queued message:', qErr);
          }
        }
      }
    };

    this.client.onDisconnect = () => {
      this.connected = false;
      this.stopHeartbeat();
      console.log('[STOMP] Disconnected');
    };

    this.client.onStompError = (frame) => {
      console.error('[STOMP ERROR]', frame.headers['message'], frame.body);
    };

    this.client.activate();
  }

  public disconnect() {
    this.stopHeartbeat();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.connected = false;
  }

  public subscribe(destination: string, callback: MessageCallback) {
    if (!this.connected || !this.client) {
      const callbacks = this.pendingSubscriptions.get(destination) || [];
      callbacks.push(callback);
      this.pendingSubscriptions.set(destination, callbacks);
      return;
    }

    if (this.subscriptions.has(destination)) {
      return;
    }

    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      try {
        const parsed = JSON.parse(msg.body);
        callback(parsed);
      } catch {
        callback(msg.body);
      }
    });

    this.subscriptions.set(destination, sub);
  }

  public unsubscribe(destination: string) {
    const sub = this.subscriptions.get(destination);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public send(destination: string, body: any) {
    if (!this.connected || !this.client) {
      console.warn('[STOMP] Not connected yet, queuing message for:', destination);
      this.messageQueue.push({ destination, body });
      return;
    }

    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.warn('[STOMP] Publish error, queuing message:', err);
      this.messageQueue.push({ destination, body });
    }
  }

  private subscribeToPrivateQueue() {
    this.subscribe('/user/queue/messages', (event) => {
      window.dispatchEvent(new CustomEvent('samvaad:private_message', { detail: event }));
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.connected && this.client) {
        this.client.publish({ destination: '/app/presence.heartbeat' });
      }
    }, 25000); // Send heartbeat every 25s (well within 70s Redis TTL)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export const stompService = new StompService();
