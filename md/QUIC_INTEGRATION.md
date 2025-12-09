# QUIC Server Integration Guide

## Why QUIC for Video Streaming?

### Performance Benefits

1. **0-RTT Connection Setup**
   - Traditional TCP: 3-way handshake (~100-300ms)
   - QUIC: 0-RTT for returning connections (~0-50ms)
   - **Result**: Faster initial connection, better user experience

2. **Multiplexing Without Head-of-Line Blocking**
   - TCP: One lost packet blocks entire connection
   - QUIC: Multiple streams, lost packet only affects one stream
   - **Result**: Smoother video playback, less buffering

3. **Built-in Encryption (TLS 1.3)**
   - No separate TLS handshake needed
   - **Result**: Lower latency, better security

4. **Connection Migration**
   - Handles network changes (WiFi to mobile) seamlessly
   - **Result**: No dropped connections during network switches

5. **Better Congestion Control**
   - Improved algorithms over TCP
   - **Result**: Better performance on unreliable networks

### Use Cases in This System

- **Low-latency video streaming**: Real-time video feeds
- **Screen sharing**: High-quality, low-latency screen transmission
- **Live broadcasting**: One-to-many streaming
- **Video conferencing**: When WebRTC P2P isn't suitable

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 1: Authenticate & Get Streaming Token             │  │
│  │  POST /api/v1/quic/session                                │  │
│  │  → Node.js Server (Port 5000)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 2: Connect to QUIC Server                           │  │
│  │  WebTransport API → Python QUIC Server (Port 4433)      │  │
│  │  Uses token from Step 1 for authentication               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 3: Stream Video                                    │  │
│  │  Direct QUIC connection for low-latency streaming        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│  Node.js      │                          │  Python       │
│  Server       │                          │  QUIC Server   │
│  (Port 5000)  │                          │  (Port 4433)   │
│               │                          │               │
│  - Auth       │                          │  - Streaming  │
│  - Control    │                          │  - Low Latency│
│  - Token Gen  │                          │  - HTTP/3     │
│  - API        │                          │  - UDP        │
└───────────────┘                          └───────────────┘
        │                                           │
        └───────────────────────────────────────────┘
                    (Control & Coordination)
```

## Integration Flow

### 1. Client Requests Streaming Session

```javascript
// Frontend code
const response = await fetch('/api/v1/quic/session', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    streamId: 'my-stream-123'
  })
});

const { sessionToken, quicServer } = await response.json();
```

### 2. Client Connects to QUIC Server

```javascript
// Using WebTransport API (experimental browser API)
const transport = new WebTransport(quicServer.webTransportUrl);
await transport.ready;

// Send authentication token
const stream = await transport.createBidirectionalStream();
const writer = stream.writable.getWriter();
await writer.write(new TextEncoder().encode(JSON.stringify({
  token: sessionToken,
  action: 'authenticate'
})));
```

### 3. Stream Video Data

```javascript
// Send video frames
const videoStream = await transport.createUnidirectionalStream();
const videoWriter = videoStream.getWriter();

// Capture from camera
const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
const videoTrack = mediaStream.getVideoTracks()[0];
const processor = new MediaStreamTrackProcessor({ track: videoTrack });

// Read frames and send via QUIC
const reader = processor.readable.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Encode frame and send
  const frameData = await encodeFrame(value);
  await videoWriter.write(frameData);
}
```

## Why This Architecture?

### Separation of Concerns

1. **Node.js Server (Control Plane)**
   - Handles authentication & authorization
   - Manages user sessions
   - Provides REST API
   - Database operations
   - Business logic

2. **Python QUIC Server (Data Plane)**
   - Optimized for low-latency streaming
   - Handles UDP/QUIC protocol
   - Video frame processing
   - Minimal overhead

### Benefits

- **Scalability**: Can scale QUIC servers independently
- **Performance**: Each server optimized for its purpose
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Can swap QUIC implementation (Python/Go) without changing Node.js code

## Connection Methods

### Method 1: Direct QUIC Connection (Recommended)

```
Client → QUIC Server (Port 4433)
- Fastest path
- Lowest latency
- Direct UDP connection
```

### Method 2: HTTP Proxy (Fallback)

```
Client → Node.js Server → HTTP Proxy → QUIC Server
- For clients without QUIC support
- Higher latency
- Use WebSocket as fallback
```

## Configuration

### Environment Variables

Add to `Server/.env`:

```env
# QUIC Server Configuration
QUIC_SERVER_HOST=localhost
QUIC_SERVER_PORT=4433
QUIC_SERVER_HTTP_PORT=8080  # Optional HTTP proxy port
```

### Starting Both Servers

**Terminal 1 - Node.js Server:**
```bash
cd Server
npm start
# Runs on port 5000
```

**Terminal 2 - Python QUIC Server:**
```bash
cd quic-stream/python
source .venv/bin/activate
python server.py --host 0.0.0.0 --port 4433
# Runs on port 4433
```

## API Endpoints

### GET `/api/v1/quic/info`
Get QUIC server connection information.

**Response:**
```json
{
  "success": true,
  "data": {
    "host": "localhost",
    "port": 4433,
    "protocol": "quic",
    "url": "quic://localhost:4433",
    "webTransportUrl": "https://localhost:4433",
    "authToken": "base64-encoded-token"
  }
}
```

### POST `/api/v1/quic/session`
Create a new streaming session.

**Request:**
```json
{
  "streamId": "optional-stream-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionToken": "token-string",
    "expiresAt": 1234567890,
    "streamId": "stream-123",
    "quicServer": {
      "host": "localhost",
      "port": 4433,
      "webTransportUrl": "https://localhost:4433"
    }
  }
}
```

### GET `/api/v1/quic/health`
Check QUIC server health status.

## Frontend Integration

### React Hook Example

```typescript
// useQuicStream.ts
import { useState } from 'react';

export const useQuicStream = () => {
  const [transport, setTransport] = useState<WebTransport | null>(null);
  
  const connect = async (token: string, serverUrl: string) => {
    const wt = new WebTransport(serverUrl);
    await wt.ready;
    
    // Authenticate
    const stream = await wt.createBidirectionalStream();
    const writer = stream.writable.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify({ token })));
    
    setTransport(wt);
    return wt;
  };
  
  const sendFrame = async (frameData: ArrayBuffer) => {
    if (!transport) throw new Error('Not connected');
    const stream = await transport.createUnidirectionalStream();
    const writer = stream.writable.getWriter();
    await writer.write(frameData);
    await writer.close();
  };
  
  return { connect, sendFrame, transport };
};
```

## Monitoring & Metrics

### Key Metrics to Track

1. **Connection Setup Time**: 0-RTT vs 1-RTT
2. **Stream Latency**: End-to-end frame delivery time
3. **Packet Loss**: QUIC handles this better than TCP
4. **Throughput**: Mbps per stream
5. **Concurrent Streams**: How many streams per connection

### Integration with Prometheus

The Node.js server already has metrics middleware. Add QUIC-specific metrics:

```javascript
// In metricsService.js
quicConnections: new promClient.Gauge({
  name: 'quic_connections_total',
  help: 'Total active QUIC connections'
}),

quicStreamLatency: new promClient.Histogram({
  name: 'quic_stream_latency_seconds',
  help: 'QUIC stream latency in seconds'
})
```

## Troubleshooting

### QUIC Server Not Responding

1. Check if Python server is running:
   ```bash
   ps aux | grep server.py
   ```

2. Check port availability:
   ```bash
   lsof -i :4433
   ```

3. Check firewall rules (UDP port 4433)

### Browser Compatibility

- **Chrome/Edge**: WebTransport API supported (experimental)
- **Firefox**: Limited support
- **Safari**: No support yet

**Fallback**: Use WebSocket proxy through Node.js server

## Next Steps

1. ✅ Node.js integration endpoints created
2. ✅ Python QUIC server running
3. ⏳ Frontend WebTransport client implementation
4. ⏳ Authentication token validation in Python server
5. ⏳ Metrics collection
6. ⏳ Load balancing for multiple QUIC servers


