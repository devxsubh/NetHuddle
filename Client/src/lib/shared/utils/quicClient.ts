/**
 * QUIC Client for Browser
 * Note: Browsers don't directly support QUIC, so we use WebTransport API
 * or proxy through WebSocket
 */

/**
 * Connection statistics
 */
export interface QuicConnectionStats {
  connectionTime: number;
  bytesSent: number;
  bytesReceived: number;
  latency: number;
  framesSent: number;
  framesReceived: number;
}

/**
 * Connection event callbacks
 */
export interface QuicClientCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onData?: (data: ArrayBuffer) => void;
}

/**
 * WebTransport-based QUIC client (experimental)
 * Requires browser support for WebTransport API
 */
export class QuicClient {
  private transport: WebTransport | null = null;
  private isConnected: boolean = false;
  private connectionStartTime: number = 0;
  private stats: QuicConnectionStats = {
    connectionTime: 0,
    bytesSent: 0,
    bytesReceived: 0,
    latency: 0,
    framesSent: 0,
    framesReceived: 0,
  };
  private callbacks: QuicClientCallbacks = {};
  private receiveStreamReader: ReadableStreamDefaultReader<ReadableWritablePair<Uint8Array, Uint8Array>> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: QuicClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Connect to QUIC server via WebTransport
   */
  async connect(url: string, authToken?: string): Promise<void> {
    try {
      // Check if WebTransport is available
      if (typeof WebTransport === 'undefined') {
        throw new Error(
          'WebTransport is not supported in this browser. ' +
          'Please use a modern browser (Chrome 97+, Edge 97+) or access via HTTPS/localhost.'
        );
      }

      // Check secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
          throw new Error(
            `WebTransport requires a secure context (HTTPS). ` +
            `You are accessing via ${protocol}//${hostname}. ` +
            `Please use HTTPS or access via localhost/127.0.0.1.`
          );
        }
      }

      this.connectionStartTime = Date.now();
      
      // WebTransport uses quic:// or https:// URLs
      this.transport = new WebTransport(url);

      await this.transport.ready;
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Send authentication token if provided
      if (authToken) {
        await this.sendAuthentication(authToken);
      }

      // Start receiving streams
      this.startReceiving();

      this.stats.connectionTime = Date.now() - this.connectionStartTime;
      console.log('QUIC: Connected via WebTransport');
      this.callbacks.onConnected?.();
    } catch (error) {
      console.error('QUIC: Connection failed', error);
      this.isConnected = false;
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Send authentication token
   */
  private async sendAuthentication(token: string): Promise<void> {
    if (!this.transport) return;

    try {
      const stream = await this.transport.createBidirectionalStream();
      const writer = stream.writable.getWriter();
      const authMessage = JSON.stringify({ token, action: 'authenticate' });
      await writer.write(new TextEncoder().encode(authMessage));
      await writer.close();
    } catch (error) {
      console.error('QUIC: Authentication failed', error);
    }
  }

  /**
   * Start receiving incoming streams
   */
  private async startReceiving(): Promise<void> {
    if (!this.transport) return;

    try {
      const streams = this.transport.incomingBidirectionalStreams;
      this.receiveStreamReader = streams.getReader();

      // Process incoming streams
      this.processIncomingStreams();
    } catch (error) {
      console.error('QUIC: Error starting receive', error);
    }
  }

  /**
   * Process incoming bidirectional streams
   */
  private async processIncomingStreams(): Promise<void> {
    if (!this.receiveStreamReader) return;

    try {
      while (this.isConnected) {
        const { value, done } = await this.receiveStreamReader.read();
        if (done) break;

        const stream = value;
        const streamReader = stream.readable.getReader();

        while (true) {
          const { value: chunk, done: streamDone } = await streamReader.read();
          if (streamDone) break;

          if (chunk) {
            this.stats.bytesReceived += chunk.byteLength;
            this.stats.framesReceived++;
            this.callbacks.onData?.(chunk.buffer);
          }
        }
      }
    } catch (error) {
      if (this.isConnected) {
        console.error('QUIC: Error processing streams', error);
        this.callbacks.onError?.(error as Error);
      }
    }
  }

  /**
   * Send video stream data
   */
  async sendStream(data: ArrayBuffer): Promise<void> {
    if (!this.transport || !this.isConnected) {
      throw new Error('Not connected to QUIC server');
    }

    try {
      const stream = await this.transport.createUnidirectionalStream();
      const writer = stream.writable.getWriter();
      
      const startTime = performance.now();
      await writer.write(new Uint8Array(data));
      await writer.close();

      const endTime = performance.now();
      this.stats.bytesSent += data.byteLength;
      this.stats.framesSent++;
      this.stats.latency = endTime - startTime;

      console.log('QUIC: Stream data sent', { size: data.byteLength, latency: this.stats.latency });
    } catch (error) {
      console.error('QUIC: Error sending stream', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): QuicConnectionStats {
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Reconnect with exponential backoff
   */
  async reconnect(url: string, authToken?: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    await this.close();
    await this.connect(url, authToken);
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.receiveStreamReader) {
      try {
        await this.receiveStreamReader.cancel();
      } catch (error) {
        // Ignore cancel errors
      }
      this.receiveStreamReader = null;
    }

    if (this.transport) {
      try {
        await this.transport.close();
      } catch (error) {
        console.error('QUIC: Error closing transport', error);
      }
      this.transport = null;
    }

    this.isConnected = false;
    this.stats = {
      connectionTime: 0,
      bytesSent: 0,
      bytesReceived: 0,
      latency: 0,
      framesSent: 0,
      framesReceived: 0,
    };
    console.log('QUIC: Connection closed');
    this.callbacks.onDisconnected?.();
  }
}

/**
 * WebSocket proxy for QUIC (fallback)
 * Since browsers don't fully support QUIC, we can proxy through WebSocket
 */
export class QuicWebSocketProxy {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private connectionStartTime: number = 0;
  private stats: QuicConnectionStats = {
    connectionTime: 0,
    bytesSent: 0,
    bytesReceived: 0,
    latency: 0,
    framesSent: 0,
    framesReceived: 0,
  };
  private callbacks: QuicClientCallbacks = {};

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: QuicClientCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Connect via WebSocket proxy
   */
  async connect(wsUrl: string, authToken?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connectionStartTime = Date.now();
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.stats.connectionTime = Date.now() - this.connectionStartTime;
        console.log('QUIC Proxy: Connected via WebSocket');
        
        // Send authentication if provided
        if (authToken) {
          this.socket?.send(JSON.stringify({ token: authToken, action: 'authenticate' }));
        }
        
        this.callbacks.onConnected?.();
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('QUIC Proxy: Connection error', error);
        this.isConnected = false;
        const err = new Error('WebSocket connection failed');
        this.callbacks.onError?.(err);
        reject(err);
      };

      this.socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.stats.bytesReceived += event.data.byteLength;
          this.stats.framesReceived++;
          this.callbacks.onData?.(event.data);
        } else if (event.data instanceof Blob) {
          event.data.arrayBuffer().then((buffer) => {
            this.stats.bytesReceived += buffer.byteLength;
            this.stats.framesReceived++;
            this.callbacks.onData?.(buffer);
          });
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        console.log('QUIC Proxy: Connection closed');
        this.callbacks.onDisconnected?.();
      };
    });
  }

  /**
   * Send video stream via WebSocket
   */
  async sendStream(data: ArrayBuffer): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected');
    }

    const startTime = performance.now();
    
    // Send data in chunks
    const chunkSize = 64 * 1024; // 64KB chunks
    const chunks = Math.ceil(data.byteLength / chunkSize);

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, data.byteLength);
      const chunk = data.slice(start, end);

      this.socket.send(chunk);
    }

    const endTime = performance.now();
    this.stats.bytesSent += data.byteLength;
    this.stats.framesSent++;
    this.stats.latency = endTime - startTime;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): QuicConnectionStats {
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.socket) {
      this.socket.close();
      this.isConnected = false;
      this.stats = {
        connectionTime: 0,
        bytesSent: 0,
        bytesReceived: 0,
        latency: 0,
        framesSent: 0,
        framesReceived: 0,
      };
      this.callbacks.onDisconnected?.();
    }
  }
}

/**
 * Check if WebTransport is supported
 */
export function isWebTransportSupported(): boolean {
  // Check if WebTransport is available
  if (typeof window === 'undefined') return false;
  
  // Check if WebTransport class exists
  if (typeof WebTransport === 'undefined') return false;
  
  // Check if we're in a secure context (HTTPS or localhost)
  const isSecureContext = window.isSecureContext || 
    window.location.protocol === 'https:' || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]';
  
  if (!isSecureContext) {
    console.warn('WebTransport requires a secure context (HTTPS or localhost)');
    return false;
  }
  
  return true;
}

/**
 * Create appropriate QUIC client based on browser support
 */
export function createQuicClient(url: string): QuicClient | QuicWebSocketProxy {
  if (isWebTransportSupported()) {
    console.log('QUIC: Using WebTransport client');
    return new QuicClient();
  } else {
    // Fallback to WebSocket proxy
    console.log('QUIC: WebTransport not available, using WebSocket proxy');
    // In production, you'd have a WebSocket-to-QUIC proxy server
    return new QuicWebSocketProxy();
  }
}

