# System Architecture

## Overview

This document describes the complete architecture of the Multi-Protocol Network Communication System.

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   React UI   │  │  WebRTC P2P  │  │  QUIC Client  │         │
│  │   (Next.js)  │  │   (Media)    │  │  (Streaming)  │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Signaling    │  │  Chat/File     │  │  QUIC Stream   │
│  Server       │  │  Server       │  │  Server        │
│  (HTTP+WS)    │  │  (TCP+WS)     │  │  (Go/Python)   │
│               │  │               │  │               │
│  - Auth       │  │  - WebSocket  │  │  - Video      │
│  - Rooms      │  │  - TCP        │  │  - Low Latency│
│  - SDP        │  │  - File Xfer  │  │  - HTTP/3     │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   Database     │
                    │   (MongoDB)    │
                    └────────────────┘
```

## Protocol Stack

### 1. Signaling Server (HTTP + WebSocket)
- **Purpose**: User authentication, room management, WebRTC signaling
- **Protocol**: HTTP (REST API) + WebSocket (Socket.IO)
- **Port**: 666 (HTTP), 666 (WebSocket)
- **Features**:
  - User registration/login
  - Room creation/joining
  - SDP offer/answer exchange
  - ICE candidate exchange
  - Presence management

### 2. Chat/File Transfer Server (TCP + WebSocket)
- **Purpose**: Reliable chat messaging and file transfers
- **Protocol**: WebSocket (real-time) + TCP (file transfer)
- **Port**: 666 (WebSocket), 3001 (TCP)
- **Features**:
  - Real-time chat messages
  - File chunking and transfer
  - Message persistence
  - Typing indicators

### 3. Media Server (UDP/WebRTC)
- **Purpose**: Peer-to-peer audio/video communication
- **Protocol**: WebRTC (UDP-based)
- **Port**: Dynamic (ICE negotiation)
- **Features**:
  - P2P audio/video calls
  - Screen sharing
  - NAT traversal (STUN/TURN)
  - Low latency communication

### 4. QUIC Streaming Server
- **Purpose**: Low-latency video streaming
- **Protocol**: QUIC (HTTP/3)
- **Port**: 4433 (QUIC)
- **Features**:
  - Video stream encoding (H.264/VP9)
  - Multiplexed streams
  - 0-RTT connection setup
  - Built-in encryption (TLS 1.3)

## Data Flow

### Chat Message Flow
```
Client → WebSocket → Server → Broadcast → Other Clients
```

### File Transfer Flow
```
Client → TCP Socket → Server → Chunks → Client
```

### WebRTC Call Flow
```
Client A → Signaling Server → SDP Offer → Client B
Client B → Signaling Server → SDP Answer → Client A
Client A ↔ Client B (Direct P2P via WebRTC)
```

### QUIC Streaming Flow
```
Video Source → QUIC Server → QUIC Stream → Client → Video Render
```

## Technology Stack

### Backend
- **Node.js** + **Express**: HTTP API server
- **Socket.IO**: WebSocket server
- **MongoDB**: Database
- **Redis** (optional): Caching and session management

### QUIC Service
- **Go** (quic-go): QUIC streaming server
- **Python** (aioquic): Alternative implementation

### Frontend
- **React** + **Next.js**: UI framework
- **Socket.IO Client**: WebSocket client
- **WebRTC API**: P2P media
- **WebCodecs API**: Video decoding

## Security

- **JWT Authentication**: Token-based auth for all services
- **TLS/SSL**: Encrypted connections
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: DDoS protection
- **Input Validation**: Joi validation

## Scalability

- **Horizontal Scaling**: Multiple server instances
- **Load Balancing**: Nginx/HAProxy
- **Database Sharding**: MongoDB sharding
- **CDN**: Static asset delivery

## Monitoring

- **Prometheus**: Metrics collection
- **Wireshark**: Packet analysis
- **Custom Dashboard**: Real-time stats

