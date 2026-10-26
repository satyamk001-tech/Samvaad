import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

type MessageCallback = (message: any) => void;

class StompService {
  private client: Client | null = null;
  private clientSubscriptions: Map<string, StompSubscription> = new Map();
  private destinationListeners: Map<string, Set<MessageCallback>> = new Map();
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
      debug: (str) => {
        if (str.includes('ERROR') || str.includes('CLOSED')) {
          console.warn('[STOMP NOTICE]', str);
        }
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    this.client.onConnect = () => {
      this.connected = true;
      console.log('[STOMP] Connected successfully');

      // Clear any stale client subscriptions from previous connection
      this.clientSubscriptions.clear();

      // Start presence heartbeat ping
      this.startHeartbeat();

      // Automatically re-establish all active destination subscriptions on the new connection
      this.destinationListeners.forEach((_, destination) => {
        this.bindStompSubscription(destination);
      });

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
      this.clientSubscriptions.clear();
      this.stopHeartbeat();
      console.log('[STOMP] Disconnected');
    };

    this.client.onStompError = (frame) => {
      console.error('[STOMP ERROR]', frame.headers['message'], frame.body);
    };

    this.client.activate();

    // Ensure private queue is always registered as a persistent destination
    this.subscribeToPrivateQueue();
  }

  public disconnect() {
    this.stopHeartbeat();
    this.clientSubscriptions.forEach((sub) => {
      try {
        sub.unsubscribe();
      } catch {}
    });
    this.clientSubscriptions.clear();
    this.destinationListeners.clear();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.connected = false;
  }

  public subscribe(destination: string, callback: MessageCallback) {
    if (!this.destinationListeners.has(destination)) {
      this.destinationListeners.set(destination, new Set());
    }
    this.destinationListeners.get(destination)!.add(callback);

    if (this.connected && this.client) {
      this.bindStompSubscription(destination);
    }
  }

  private bindStompSubscription(destination: string) {
    if (!this.connected || !this.client || this.clientSubscriptions.has(destination)) {
      return;
    }

    try {
      const sub = this.client.subscribe(destination, (msg: IMessage) => {
        let parsed: any;
        try {
          parsed = JSON.parse(msg.body);
        } catch {
          parsed = msg.body;
        }

        const listeners = this.destinationListeners.get(destination);
        if (listeners) {
          listeners.forEach((cb) => {
            try {
              cb(parsed);
            } catch (cbErr) {
              console.error('[STOMP Listener Error]', cbErr);
            }
          });
        }
      });

      this.clientSubscriptions.set(destination, sub);
    } catch (err) {
      console.warn('[STOMP] Subscribe error for ' + destination + ':', err);
    }
  }

  public unsubscribe(destination: string) {
    const sub = this.clientSubscriptions.get(destination);
    if (sub) {
      try {
        sub.unsubscribe();
      } catch {}
      this.clientSubscriptions.delete(destination);
    }
    this.destinationListeners.delete(destination);
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
