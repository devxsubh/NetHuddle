# Multi-Protocol Network Communication System

A comprehensive, production-ready real-time communication platform that demonstrates advanced networking concepts through the implementation of multiple communication protocols. This system enables users to interact through chat, file sharing, video calls, and low-latency streaming using TCP, UDP, WebSocket, WebRTC, and QUIC (HTTP/3) protocols.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [What's Working](#whats-working)
- [Challenges & Limitations](#challenges--limitations)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Services & Features](#services--features)
- [Protocol Implementation Details](#protocol-implementation-details)
- [Monitoring & Metrics](#monitoring--metrics)
- [Security](#security)
- [Performance Considerations](#performance-considerations)
- [Future Enhancements](#future-enhancements)

---

## Project Overview

This project is a sophisticated multi-protocol network communication system designed to showcase real-world networking implementations. It serves as both a learning platform and a production-ready application that demonstrates how different protocols can be optimally used for various communication tasks.

### Core Philosophy

The system is built on the principle that **different protocols serve different purposes**:
- **TCP**: Reliable, connection-oriented communication for file transfers
- **WebSocket**: Real-time bidirectional communication for chat and signaling
- **WebRTC**: Peer-to-peer media streaming for low-latency video/audio
- **QUIC/HTTP3**: Modern protocol for enhanced performance and security in streaming

### Project Goals

1. **Demonstrate Protocol Selection**: Show when and why to use each protocol
2. **Real-World Implementation**: Production-ready code with error handling, authentication, and monitoring
3. **Scalability**: Architecture designed for horizontal scaling
4. **Comprehensive Monitoring**: Full metrics collection and observability
5. **Security First**: JWT authentication, rate limiting, input validation

---

## Architecture

### System Architecture Diagram

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
│  - Metrics    │  │  - Chat       │  │  - UDP        │
└───────────────┘  └───────────────┘  └───────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   Database     │
                    │   (MongoDB)    │
                    └────────────────┘
```

### Protocol Stack

#### 1. Signaling Server (HTTP + WebSocket)
- **Purpose**: User authentication, room management, WebRTC signaling
- **Protocol**: HTTP (REST API) + WebSocket (Socket.IO)
- **Port**: 666 (HTTP), 666 (WebSocket)
- **Technology**: Node.js + Express + Socket.IO
- **Features**:
  - JWT-based authentication
  - Room creation and management
  - WebRTC SDP offer/answer exchange
  - ICE candidate exchange
  - User presence management
  - Network discovery
  - Real-time metrics collection

#### 2. Chat/File Transfer Server (TCP + WebSocket)
- **Purpose**: Reliable chat messaging and file transfers
- **Protocol**: WebSocket (real-time) + TCP (file transfer)
- **Port**: 666 (WebSocket), 3001 (TCP)
- **Technology**: Node.js + Socket.IO + Net (TCP)
- **Features**:
  - Real-time chat messages
  - File chunking and transfer via TCP
  - Message persistence in MongoDB
  - Typing indicators
  - File progress tracking
  - Transfer status management

#### 3. Media Server (UDP/WebRTC)
- **Purpose**: Peer-to-peer audio/video communication
- **Protocol**: WebRTC (UDP-based)
- **Port**: Dynamic (ICE negotiation)
- **Technology**: WebRTC API (Browser)
- **Features**:
  - P2P audio/video calls
  - Screen sharing
  - NAT traversal (STUN/TURN)
  - Low latency communication
  - Connection state management
  - Media stream controls

#### 4. QUIC Streaming Server
- **Purpose**: Low-latency video streaming
- **Protocol**: QUIC (HTTP/3)
- **Port**: 4433 (QUIC)
- **Technology**: Python (aioquic)
- **Features**:
  - Video stream handling
  - Multiplexed streams
  - 0-RTT connection setup
  - Built-in encryption (TLS 1.3)
  - Connection migration support

---

## What's Working

### ✅ Phase 1 & 2: Architecture & Room Management

**Status**: Fully Implemented and Tested

- **Room Management API**: Complete CRUD operations for rooms
  - Create, read, update, delete rooms
  - Room types: chat, video, streaming
  - Privacy controls (public/private)
  - Member management with roles (owner, admin, member)
  - Capacity management (configurable max members)
  
- **WebSocket Signaling**: Full WebRTC signaling implementation
  - Room join/leave events
  - SDP offer/answer exchange
  - ICE candidate exchange
  - User presence tracking
  - Broadcast and direct messaging

- **Database Models**: Complete MongoDB schema
  - User model with authentication
  - Room model with member management
  - Network session tracking
  - Friend system
  - Role-based permissions

### ✅ Phase 3: TCP/WebSocket Chat + File Transfer

**Status**: Fully Implemented and Production-Ready

- **TCP File Transfer Server**: 
  - JWT-authenticated TCP connections
  - File chunking support (64KB default)
  - Progress tracking for active transfers
  - File storage in `uploads/` directory
  - Transfer status management
  - Error handling and recovery

- **WebSocket File Transfer**:
  - Real-time file transfer via WebSocket (for browsers)
  - Chunked file uploads
  - Progress updates
  - Transfer completion notifications
  - File serving via HTTP endpoint

- **Chat System**:
  - Real-time messaging via WebSocket
  - Message persistence
  - Room-based chat
  - Typing indicators
  - Message history

### ✅ Phase 4: P2P Audio/Video (WebRTC)

**Status**: Fully Implemented with Browser Support

- **WebRTC Implementation**:
  - PeerConnection management
  - Media stream capture (camera + microphone)
  - Screen sharing support
  - SDP offer/answer exchange
  - ICE candidate exchange
  - Connection state management
  - Video/audio toggle controls

- **TURN/STUN Configuration**:
  - Google STUN servers (default)
  - Configurable TURN servers
  - Environment-based configuration
  - NAT traversal support

- **UI Components**:
  - Incoming call handling
  - Active call interface
  - Call controls (mute, video toggle, screen share, end call)
  - Picture-in-picture local video
  - Connection status display

### ✅ Phase 5: QUIC Low-Latency Streaming

**Status**: Server Implemented, Client Integration Ready

- **QUIC Server (Python)**:
  - HTTP/3 server using aioquic
  - Video stream handling
  - Stream multiplexing
  - Health check endpoint
  - Stream info endpoint
  - Certificate management

- **QUIC Service Integration**:
  - Node.js service bridge
  - Streaming token generation
  - Server health checking
  - Connection info management

- **Client Support**:
  - WebTransport API client (experimental)
  - WebSocket proxy fallback
  - Browser compatibility checking

### ✅ Phase 6: Network Monitoring & Visualization

**Status**: Fully Implemented with Prometheus

- **Prometheus Metrics Service**:
  - HTTP request metrics (duration, total)
  - WebSocket metrics (connections, messages, duration)
  - Network metrics (users, RTT)
  - File transfer metrics (total, size, duration)
  - WebRTC metrics (connections, duration)
  - QUIC metrics (connections, streams, bytes)
  - Database metrics (query duration, total)

- **Metrics Middleware**:
  - Automatic HTTP request metrics collection
  - Request duration tracking
  - Status code tracking
  - Minimal overhead (~1-2ms per request)

- **Metrics API Endpoint**:
  - Prometheus format metrics: `GET /api/v1/metrics`
  - Real-time metrics exposure
  - Compatible with Prometheus scraping

- **Frontend Dashboard**:
  - Real-time metrics display
  - WebSocket-based updates
  - Visual metric cards
  - Auto-refresh every 5 seconds

### ✅ Additional Features

- **Network Discovery**:
  - Automatic network subnet detection
  - User discovery on same network
  - Network session tracking
  - Presence management
  - Auto-cleanup of inactive sessions

- **Authentication & Authorization**:
  - JWT-based authentication (RS256)
  - Role-based access control (RBAC)
  - Token refresh mechanism
  - Email verification
  - Password reset functionality

- **Friend System**:
  - Friend requests
  - Friend management
  - Friend status tracking

- **Image Handling**:
  - Image upload and resizing
  - Avatar management
  - Image serving

---

## Challenges & Limitations

### Technical Challenges

#### 1. **QUIC Browser Support**
- **Challenge**: WebTransport API (QUIC in browsers) is still experimental
- **Status**: Implemented with WebSocket fallback
- **Impact**: Limited browser compatibility for QUIC streaming
- **Workaround**: WebSocket proxy for browsers without WebTransport support

#### 2. **NAT Traversal for WebRTC**
- **Challenge**: Complex NAT traversal scenarios
- **Status**: STUN/TURN configuration implemented
- **Impact**: Some networks require TURN server for P2P connections
- **Solution**: Configurable TURN servers, documentation for setup

#### 3. **TCP File Transfer in Browsers**
- **Challenge**: Browsers cannot directly use TCP sockets
- **Status**: WebSocket-based file transfer implemented
- **Impact**: TCP server primarily for server-to-server transfers
- **Solution**: Dual implementation (TCP for servers, WebSocket for browsers)

#### 4. **Real-time Metrics Overhead**
- **Challenge**: Metrics collection adds latency
- **Status**: Optimized with minimal overhead
- **Impact**: ~1-2ms per request
- **Solution**: Efficient metric collection, async processing

#### 5. **WebSocket Connection Scaling**
- **Challenge**: Managing thousands of concurrent WebSocket connections
- **Status**: Socket.IO with connection pooling
- **Impact**: Memory usage increases with connections
- **Solution**: Horizontal scaling, connection limits, cleanup mechanisms

#### 6. **Database Query Performance**
- **Challenge**: Complex queries for network discovery
- **Status**: Indexed queries, optimized aggregations
- **Impact**: Slower queries with large user bases
- **Solution**: Database indexing, query optimization, caching (future)

### Known Limitations

1. **QUIC Client**: Browser support is limited; requires modern browsers with WebTransport
2. **TURN Server**: Requires external TURN server for restrictive networks
3. **File Storage**: Files stored locally; no cloud storage integration
4. **Video Encoding**: QUIC server doesn't include video encoding (handled by client)
5. **Group Calls**: WebRTC supports 1-on-1 calls; group calls require SFU/MCU
6. **Metrics Retention**: Prometheus metrics not persisted; requires external Prometheus server
7. **Horizontal Scaling**: WebSocket connections don't scale across instances without Redis adapter

### Areas for Improvement

1. **Redis Integration**: For WebSocket scaling and session management
2. **Cloud Storage**: Integration with S3/CloudFront for file storage
3. **Video Encoding**: Server-side video encoding for QUIC streaming
4. **Group Video Calls**: SFU (Selective Forwarding Unit) implementation
5. **Load Balancing**: Nginx/HAProxy configuration for multiple instances
6. **Caching Layer**: Redis caching for frequently accessed data
7. **CDN Integration**: Static asset delivery via CDN
8. **Database Sharding**: MongoDB sharding for large-scale deployments

---

## Technology Stack

### Backend Server

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **WebSocket**: Socket.IO 4.8.1
- **Database**: MongoDB 6.0+ with Mongoose
- **Authentication**: JWT (RS256), Passport.js
- **Validation**: Joi 17.4.2
- **Logging**: Winston 3.3.3
- **Metrics**: Prometheus Client (prom-client) 15.1.0
- **Image Processing**: Sharp 0.29.1
- **Email**: Nodemailer 6.6.3
- **Process Management**: PM2 5.1.1

### QUIC Service

- **Language**: Python 3.10+
- **Library**: aioquic
- **Protocol**: HTTP/3 over QUIC
- **Encryption**: TLS 1.3

### Database

- **Primary**: MongoDB
- **Models**: User, Room, NetworkSession, Friend, Role, Token, RoomMessage, NetworkFileShare

### Development Tools

- **Transpilation**: Babel (ES6+ to Node.js compatible)
- **Linting**: ESLint with Airbnb config
- **Formatting**: Prettier
- **Hot Reload**: Nodemon
- **Environment**: dotenv

---

## Installation

### Prerequisites

- Node.js 18 or higher
- MongoDB 6.0 or higher
- Python 3.10+ (for QUIC server)
- npm or yarn

### Server Installation

```bash
# Clone the repository
git clone <repository-url>
cd Network/Server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# See Configuration section for details

# Start MongoDB (if not running)
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: net start MongoDB

# Start the server
npm run dev
# or for production
npm run build
npm run prod
```

### QUIC Server Installation

```bash
cd quic-stream/python

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate certificates
./generate_certificates.sh  # On Windows: use Git Bash or WSL

# Start QUIC server
python server.py --host 0.0.0.0 --port 4433
```

### Client Installation

```bash
cd Client

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

---

## Configuration

### Server Environment Variables

Create a `.env` file in the `Server/` directory:

```env
# App Configuration
APP_NAME=NetHuddle
NODE_ENV=development
HOST=0.0.0.0
PORT=666

# Database
DATABASE_URI=mongodb://127.0.0.1:27017/nethuddle

# JWT Configuration (RS256 - requires public/private key pair)
JWT_ACCESS_TOKEN_SECRET_PRIVATE=<base64-encoded-private-key>
JWT_ACCESS_TOKEN_SECRET_PUBLIC=<base64-encoded-public-key>
JWT_ACCESS_TOKEN_EXPIRATION_MINUTES=240

# Token Expiration
REFRESH_TOKEN_EXPIRATION_DAYS=1
VERIFY_EMAIL_TOKEN_EXPIRATION_MINUTES=60
RESET_PASSWORD_TOKEN_EXPIRATION_MINUTES=30

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@nethuddle.com

# Frontend URL
FRONTEND_URL=http://localhost:777

# Image URL
IMAGE_URL=http://localhost:666/images

# TCP Server Port
TCP_PORT=3001

# QUIC Server Configuration
QUIC_SERVER_HOST=localhost
QUIC_SERVER_PORT=4433
```

### Generating JWT Keys

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key
openssl rsa -in private.pem -pubout -out public.pem

# Convert to base64 for .env file
cat private.pem | base64 > private_base64.txt
cat public.pem | base64 > public_base64.txt
```

### QUIC Server Configuration

The QUIC server uses self-signed certificates for development. For production, use certificates from a trusted CA (Let's Encrypt, etc.).

---

## API Documentation

### Authentication Endpoints

#### Register User
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "userName": "johndoe",
  "email": "john@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "access": { "token": "...", "expires": "..." },
      "refresh": { "token": "...", "expires": "..." }
    }
  }
}
```

#### Refresh Token
```
POST /api/v1/auth/refresh-tokens
Content-Type: application/json

{
  "refreshToken": "refresh-token-here"
}
```

### Room Management Endpoints

#### Create Room
```
POST /api/v1/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Video Call Room",
  "description": "Room for video calls",
  "type": "video",
  "maxMembers": 5,
  "isPrivate": false
}
```

#### List Rooms
```
GET /api/v1/rooms
Authorization: Bearer <token>
```

#### Get Room Details
```
GET /api/v1/rooms/:roomId
Authorization: Bearer <token>
```

#### Join Room
```
POST /api/v1/rooms/:roomId/join
Authorization: Bearer <token>
```

#### Leave Room
```
POST /api/v1/rooms/:roomId/leave
Authorization: Bearer <token>
```

### Network Discovery Endpoints

#### Get Network Users
```
GET /api/v1/network/users
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "...",
        "firstName": "John",
        "lastName": "Doe",
        "userName": "johndoe",
        "avatar": "avatar.png",
        "lastSeen": "2024-01-15T10:30:00.000Z",
        "ipAddress": "192.168.1.105"
      }
    ],
    "networkInfo": {
      "networkSubnet": "192.168.1.0",
      "yourIpAddress": "192.168.1.100",
      "totalUsers": 3
    }
  }
}
```

#### Update Network Presence
```
POST /api/v1/network/presence
Authorization: Bearer <token>
```

### File Transfer Endpoints

#### Get Transfer Status
```
GET /api/v1/file-transfer/:transferId
Authorization: Bearer <token>
```

#### Get All Transfers
```
GET /api/v1/file-transfer
Authorization: Bearer <token>
```

### Metrics Endpoint

#### Get Prometheus Metrics
```
GET /api/v1/metrics

Response: Prometheus format metrics
```

### QUIC Endpoints

#### Create Streaming Session
```
POST /api/v1/quic/session
Authorization: Bearer <token>
Content-Type: application/json

{
  "streamId": "my-stream-123"
}

Response:
{
  "success": true,
  "data": {
    "sessionToken": "...",
    "quicServer": {
      "host": "localhost",
      "port": 4433,
      "url": "quic://localhost:4433",
      "webTransportUrl": "https://localhost:4433"
    }
  }
}
```

---

## Services & Features

### WebSocket Events

#### Client → Server Events

- `room:join` - Join a room
- `room:leave` - Leave a room
- `webrtc:offer` - Send SDP offer
- `webrtc:answer` - Send SDP answer
- `webrtc:ice-candidate` - Send ICE candidate
- `message` - Send chat message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `file:transfer:start` - Start file transfer
- `file:transfer:chunk` - Send file chunk
- `file:transfer:progress` - Update transfer progress

#### Server → Client Events

- `room:joined` - Successfully joined room
- `room:left` - Successfully left room
- `room:user-joined` - User joined room
- `room:user-left` - User left room
- `webrtc:offer` - Receive SDP offer
- `webrtc:answer` - Receive SDP answer
- `webrtc:ice-candidate` - Receive ICE candidate
- `message` - Receive chat message
- `typing` - User typing indicator
- `file:transfer:started` - Transfer started
- `file:transfer:progress` - Transfer progress update
- `file:transfer:completed` - Transfer completed
- `file:transfer:error` - Transfer error

### Network Discovery Service (Same Subnet Detection)

The network discovery feature is a sophisticated system that automatically detects and displays users on the same local network (same IP subnet). This enables users to discover and communicate with people physically nearby, such as in the same office, home, or public WiFi network.

#### How Network Discovery Works

**1. IP Address Detection**
- When a user authenticates (login/signup), their IP address is automatically captured
- The system handles various network scenarios:
  - **Direct Connection**: Uses `req.connection.remoteAddress`
  - **Behind Proxy**: Checks `X-Forwarded-For` header (first IP in chain)
  - **Load Balancer**: Checks `X-Real-IP` header
  - **IPv6 Support**: Handles IPv6 addresses with prefix extraction

**2. Network Subnet Calculation**
The system calculates the network subnet from the IP address:
- **IPv4**: Uses first 3 octets (Class C subnet)
  - Example: `192.168.1.105` → `192.168.1.0`
  - This groups all devices on the same local network segment
- **IPv6**: Uses first 64 bits (simplified)
  - Example: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` → `2001:0db8:85a3:0000::`
- **Localhost**: Handled separately for development

**3. Session Tracking**
Each user's network session is tracked in MongoDB with:
- **User ID**: Reference to the user account
- **IP Address**: Client's actual IP address
- **Network Subnet**: Calculated subnet (e.g., `192.168.1.0`)
- **User Agent**: Browser/client information
- **Last Seen**: Timestamp of last activity
- **Active Status**: Boolean flag for active sessions

**4. Automatic Session Management**
- **Creation**: Session created automatically on authentication
- **Updates**: 
  - Middleware (`trackNetwork.js`) updates `lastSeen` on authenticated requests
  - WebSocket connections also update presence
  - Manual heartbeat via `POST /api/v1/network/presence`
- **Deactivation**: Sessions deactivated on logout
- **Auto-Cleanup**: MongoDB TTL index removes inactive sessions after 1 hour

**5. Database Schema & Indexing**
The `NetworkSession` model uses optimized indexes:
- Compound index: `{ networkSubnet: 1, isActive: 1, lastSeen: -1 }` for fast queries
- TTL index: `{ lastSeen: 1 }` with `expireAfterSeconds: 3600` for auto-cleanup
- User index for efficient user lookups

#### Frontend Display

**Network Sidebar Component** (`NetworkSidebar.tsx`):
- Displays list of users on the same network
- Shows user avatars, names, and last seen timestamps
- Auto-refreshes every 30 seconds via presence heartbeat
- Shows network information (subnet, total users)

**Network Page** (`NetworkPageClient.tsx`):
- **Network Radar Visualization**: Interactive radar-style visualization showing users
- **Network Info Panel**: Displays subnet, total users, and network statistics
- **User Cards**: Clickable user cards with avatars and status
- **Quick Actions**: Create rooms with network users, start chats, initiate calls

**Network Radar Component** (`NetworkRadar.tsx`):
- Visual representation of users on the network
- Interactive positioning of users
- Click handlers for user interactions
- Real-time updates when users join/leave

#### API Endpoints

**Get Network Users**:
```http
GET /api/v1/network/users
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "userId": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "Doe",
        "userName": "johndoe",
        "avatar": "avatar.png",
        "lastSeen": "2024-01-15T10:30:00.000Z",
        "ipAddress": "192.168.1.105",
        "userAgent": "Mozilla/5.0..."
      }
    ],
    "networkInfo": {
      "networkSubnet": "192.168.1.0",
      "yourIpAddress": "192.168.1.100",
      "totalUsers": 3
    }
  }
}
```

**Update Presence (Heartbeat)**:
```http
POST /api/v1/network/presence
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Presence updated"
}
```

**Get Network Statistics**:
```http
GET /api/v1/network/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "networkSubnet": "192.168.1.0",
    "yourIpAddress": "192.168.1.100",
    "activeUsers": 3,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### WebSocket Integration

Network discovery is integrated with WebSocket for real-time updates:
- When users join/leave the network, other users are notified
- Presence updates broadcast to network room
- Network room: `network:${networkSubnet}` (e.g., `network:192.168.1.0`)

#### Use Cases

1. **Local Collaboration**: Discover colleagues in the same office
2. **Home Networks**: See family members on home WiFi
3. **Public WiFi**: Find people on the same public network
4. **P2P Setup**: Identify users for direct peer-to-peer connections
5. **Network-Based Chat**: Create rooms with people on your network
6. **File Sharing**: Share files with nearby users

#### Security Considerations

- **IP Privacy**: IP addresses only visible to users on the same network
- **Authentication Required**: All endpoints require JWT authentication
- **Rate Limiting**: Standard rate limiting applies
- **Session Expiration**: Old sessions automatically cleaned up
- **Network Isolation**: Users can only see others on their subnet

#### Performance Optimizations

- **Efficient Queries**: Compound indexes for fast subnet lookups
- **TTL Indexes**: Automatic cleanup prevents database bloat
- **Caching**: Network user lists can be cached (future enhancement)
- **Pagination**: Large networks can be paginated (future enhancement)

### File Transfer Service

**TCP File Transfer:**
- JWT-authenticated connections
- Chunked file transfer (64KB chunks)
- Progress tracking
- File storage in `uploads/` directory
- Transfer status management

**WebSocket File Transfer:**
- Browser-compatible file transfer
- Real-time progress updates
- Chunked uploads
- Automatic retry on failure

### Metrics Service (Comprehensive Monitoring)

The system includes a comprehensive metrics collection service using Prometheus format, providing real-time insights into system performance, usage patterns, and health.

#### Metrics Collection Architecture

**1. Metrics Middleware** (`middlewares/metrics.js`):
- Automatically intercepts all HTTP requests
- Records request duration, method, route, and status code
- Minimal overhead (~1-2ms per request)
- Non-blocking: Metrics recorded asynchronously on response finish

**2. Metrics Service** (`services/metricsService.js`):
- Uses `prom-client` library for Prometheus-compatible metrics
- Default system metrics (CPU, memory, event loop, etc.)
- Custom application metrics
- Centralized registry for all metrics

**3. Metrics Endpoint**:
```http
GET /api/v1/metrics
Content-Type: text/plain

# Returns Prometheus format metrics
```

#### Available Metrics

**HTTP Metrics:**
- `http_request_duration_seconds` (Histogram)
  - Labels: `method`, `route`, `status_code`
  - Buckets: 0.1s, 0.3s, 0.5s, 0.7s, 1s, 3s, 5s, 7s, 10s
  - Tracks request processing time
- `http_requests_total` (Counter)
  - Labels: `method`, `route`, `status_code`
  - Total number of HTTP requests

**WebSocket Metrics:**
- `websocket_connections_total` (Gauge)
  - Current number of active WebSocket connections
  - Updated on connect/disconnect
- `websocket_messages_total` (Counter)
  - Labels: `event_type`
  - Total WebSocket messages by event type
- `websocket_message_duration_seconds` (Histogram)
  - Labels: `event_type`
  - Buckets: 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s
  - Message processing duration

**Network Metrics:**
- `network_users_total` (Gauge)
  - Labels: `network_subnet`
  - Number of users per network subnet
  - Updated when users join/leave network
- `network_rtt_seconds` (Histogram)
  - Labels: `network_subnet`
  - Buckets: 0.01s, 0.05s, 0.1s, 0.2s, 0.5s, 1s, 2s
  - Round trip time measurements

**File Transfer Metrics:**
- `file_transfers_total` (Counter)
  - Labels: `status` (started, completed, failed)
  - Total file transfers
- `file_transfer_size_bytes` (Histogram)
  - Buckets: 1KB, 10KB, 100KB, 1MB, 10MB, 100MB, 1GB
  - File size distribution
- `file_transfer_duration_seconds` (Histogram)
  - Buckets: 1s, 5s, 10s, 30s, 60s, 120s, 300s
  - Transfer duration

**WebRTC Metrics:**
- `webrtc_connections_total` (Gauge)
  - Active WebRTC connections
- `webrtc_connection_duration_seconds` (Histogram)
  - Buckets: 10s, 30s, 60s, 300s, 600s, 1800s, 3600s
  - Connection duration

**QUIC Metrics:**
- `quic_connections_total` (Gauge)
  - Active QUIC connections
- `quic_streams_total` (Gauge)
  - Active QUIC streams
- `quic_stream_bytes_total` (Counter)
  - Labels: `direction` (in, out)
  - Total bytes transferred

**Database Metrics:**
- `database_query_duration_seconds` (Histogram)
  - Labels: `operation`, `collection`
  - Buckets: 0.01s, 0.05s, 0.1s, 0.5s, 1s, 2s, 5s
  - Query execution time
- `database_queries_total` (Counter)
  - Labels: `operation`, `collection`, `status`
  - Total queries by type and status

**System Metrics (Default from prom-client):**
- `process_cpu_user_seconds_total`
- `process_cpu_system_seconds_total`
- `process_resident_memory_bytes`
- `nodejs_heap_size_total_bytes`
- `nodejs_heap_size_used_bytes`
- `nodejs_eventloop_lag_seconds`
- And many more...

#### Frontend Metrics Display

**1. Metrics Dashboard Component** (`MetricsDashboard.tsx`):
- Real-time metrics display with visual cards
- WebSocket-based updates (every 5 seconds)
- Displays:
  - WebSocket Connections
  - Network Users
  - Active Rooms
  - File Transfers
  - WebRTC Connections
  - QUIC Connections
  - Round Trip Time (RTT)
  - Throughput (Mbps)

**2. Metrics Monitor Page** (`MetricsPageClient.tsx`):
- Full Prometheus metrics viewer
- Terminal-style interface with color coding
- Categories metrics by type:
  - HTTP
  - WebSocket
  - Network
  - File Transfer
  - WebRTC
  - QUIC
  - Database
  - System
- Auto-refresh every 3 seconds (configurable)
- Parses and formats Prometheus format metrics
- Shows metric names, labels, values, and types

**3. Metrics Card Component**:
- Visual metric cards with icons
- Color-coded by metric type
- Real-time value updates
- Formatted values (e.g., "1.5 Mbps", "23 ms")

#### Metrics Integration Points

**HTTP Requests:**
- Middleware automatically records all HTTP requests
- No code changes needed in controllers

**WebSocket Events:**
- Metrics recorded in `socket.js` for each event:
  - `room:join`, `room:leave`
  - `webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`
  - `file:transfer:start`, `file:transfer:chunk`, `file:transfer:complete`
  - `message`, `network:getUsers`, `presence:update`
- Connection count updated on connect/disconnect

**File Transfers:**
- TCP and WebSocket file transfers tracked
- Size, duration, and status recorded
- Network file shares also tracked

**Network Discovery:**
- Network user count updated when users join/leave
- Subnet-based tracking

#### Prometheus Integration

**Scraping Configuration:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'network-server'
    static_configs:
      - targets: ['localhost:666']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 5s
```

**Example Queries:**
```promql
# HTTP request rate
rate(http_requests_total[5m])

# 95th percentile request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active WebSocket connections
websocket_connections_total

# Network users by subnet
network_users_total

# File transfer success rate
rate(file_transfers_total{status="completed"}[5m]) / rate(file_transfers_total[5m])
```

#### Performance Impact

- **Overhead**: ~1-2ms per HTTP request
- **Memory**: Minimal (Prometheus client is efficient)
- **Storage**: Metrics not persisted (requires external Prometheus)
- **Scalability**: Metrics collection scales with application

#### Monitoring Best Practices

1. **Alerting**: Set up Prometheus alerts for:
   - High error rates
   - Slow request durations
   - Connection drops
   - High memory usage

2. **Dashboards**: Create dashboards for:
   - Request rates and latencies
   - Connection counts
   - Error rates
   - System resource usage

3. **Retention**: Configure Prometheus retention policy
4. **Cardinality**: Limit label combinations to prevent high cardinality
5. **Recording Rules**: Use recording rules for expensive queries

---

## Protocol Implementation Details

### TCP Implementation

**File**: `Server/src/services/tcpServer.js`

- **Port**: 3001 (configurable)
- **Authentication**: JWT token in header
- **Protocol**: Custom binary protocol with JSON header
- **Features**:
  - Header-first protocol (JSON metadata + binary data)
  - Chunked file transfer
  - Progress tracking
  - Error handling
  - Connection cleanup

**Protocol Format:**
```
[Header (JSON + newline)]
[File Data (binary)]
```

### WebSocket Implementation

**File**: `Server/src/config/socket.js`

- **Library**: Socket.IO 4.8.1
- **Transport**: WebSocket with polling fallback
- **Authentication**: JWT token in handshake
- **Features**:
  - Room-based messaging
  - Direct user messaging
  - WebRTC signaling
  - File transfer events
  - Typing indicators
  - Presence management

### WebRTC Implementation

**Client-side**: `Client/src/hooks/useWebRTC/useWebRTC.ts`

- **STUN Servers**: Google's public STUN servers
- **TURN Servers**: Configurable via environment variables
- **Features**:
  - PeerConnection management
  - Media stream handling
  - Screen sharing
  - ICE candidate exchange
  - SDP offer/answer exchange
  - Connection state management

### QUIC Implementation

**Server**: `quic-stream/python/server.py`

- **Library**: aioquic
- **Protocol**: HTTP/3 over QUIC
- **Port**: 4433
- **Features**:
  - HTTP/3 connection handling
  - Stream multiplexing
  - Video stream processing
  - Health check endpoint
  - Stream info endpoint

---

## Monitoring & Metrics

### Prometheus Integration

The system exposes metrics in Prometheus format at `/api/v1/metrics`. These metrics can be scraped by a Prometheus server for long-term storage and visualization.

**Metrics Endpoint:**
```
GET /api/v1/metrics
```

**Example Metrics:**
```
# HTTP Request Duration
http_request_duration_seconds_bucket{method="GET",route="/api/v1/rooms",status_code="200",le="0.1"} 45

# WebSocket Connections
websocket_connections_total 23

# Network Users
network_users_total{network_subnet="192.168.1.0"} 5

# File Transfers
file_transfers_total{status="completed"} 120
```

### Frontend Dashboard

The frontend includes a real-time metrics dashboard that displays:
- WebSocket connections
- Network users
- Active rooms
- File transfers
- WebRTC connections
- QUIC connections
- Round trip time (RTT)
- Throughput

### Logging

**Winston Logger Configuration:**
- **Development**: Debug level with colored output
- **Production**: Warn level with file rotation
- **Log Files**: `logs/combined.log`, `logs/error.log`
- **Format**: JSON with timestamps

---

## Security

### Authentication

- **JWT Tokens**: RS256 algorithm (asymmetric encryption)
- **Token Expiration**: Configurable (default 240 minutes)
- **Refresh Tokens**: Long-lived tokens for session renewal
- **Token Storage**: HTTP-only cookies (recommended) or localStorage

### Authorization

- **Role-Based Access Control (RBAC)**: 
  - Owner, Admin, Member roles
  - Permission-based access control
  - Room-level permissions

### Input Validation

- **Joi Validation**: All API inputs validated
- **Sanitization**: XSS protection
- **SQL Injection**: N/A (NoSQL database)
- **NoSQL Injection**: Mongoose parameterized queries

### Rate Limiting

- **Express Rate Limiter**: Configurable limits
- **IP-based limiting**: Prevents DDoS
- **Token-based limiting**: Per-user limits

### CORS

- **Configurable Origins**: Environment-based CORS
- **Credentials**: Supported for authenticated requests
- **Preflight**: Handled automatically

### Security Headers

- **Helmet.js**: Security headers middleware
- **Content Security Policy**: Configurable
- **XSS Protection**: Enabled
- **Frame Options**: Prevent clickjacking

---

## Performance Considerations

### Server Performance

1. **Connection Pooling**: MongoDB connection pooling
2. **Compression**: Gzip compression for responses
3. **Caching**: Future Redis integration
4. **Load Balancing**: Horizontal scaling ready

### Database Performance

1. **Indexing**: Strategic indexes on frequently queried fields
2. **Query Optimization**: Efficient aggregation pipelines
3. **Connection Management**: Connection pooling
4. **Sharding**: Ready for MongoDB sharding

### Network Performance

1. **Protocol Selection**: Optimal protocol for each use case
2. **Connection Reuse**: WebSocket connection reuse
3. **Chunking**: Efficient file transfer chunking
4. **Compression**: Response compression

### Monitoring Overhead

- **Metrics Collection**: ~1-2ms per request
- **Logging**: Async logging to minimize impact
- **Database Queries**: Optimized with indexes

---

## Future Enhancements

### Short-term (Next Phase)

1. **Redis Integration**
   - WebSocket scaling across instances
   - Session management
   - Caching layer
   - Pub/Sub for real-time events

2. **Cloud Storage Integration**
   - S3/CloudFront for file storage
   - CDN for static assets
   - Image optimization pipeline

3. **Enhanced Video Features**
   - Server-side video encoding
   - Adaptive bitrate streaming
   - Video recording
   - Video transcoding

### Medium-term

1. **Group Video Calls**
   - SFU (Selective Forwarding Unit) implementation
   - Multi-participant support
   - Screen sharing in groups
   - Recording capabilities

2. **Advanced Monitoring**
   - Grafana dashboards (removed, but can be re-added)
   - Alerting system
   - Performance analytics
   - User behavior tracking

3. **Scalability Improvements**
   - Load balancer configuration
   - Database sharding
   - Microservices architecture
   - Container orchestration (Kubernetes)

### Long-term

1. **Machine Learning Integration**
   - Network optimization
   - Quality prediction
   - Anomaly detection

2. **Advanced Features**
   - End-to-end encryption
   - Virtual backgrounds
   - Noise cancellation
   - AI-powered features

3. **Mobile Applications**
   - iOS native app
   - Android native app
   - React Native implementation

---

## Project Structure

```
Network/
├── Server/                    # Node.js backend server
│   ├── src/
│   │   ├── config/           # Configuration files
│   │   │   ├── config.js     # Environment configuration
│   │   │   ├── socket.js     # WebSocket configuration
│   │   │   ├── logger.js     # Winston logger
│   │   │   └── mongoose.js   # Database connection
│   │   ├── controllers/      # Route controllers
│   │   ├── models/           # MongoDB models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic services
│   │   ├── middlewares/      # Express middlewares
│   │   ├── validations/      # Joi validations
│   │   └── utils/            # Utility functions
│   ├── uploads/             # File upload directory
│   ├── logs/                # Log files
│   └── package.json
├── Client/                   # Next.js frontend
│   └── src/
│       ├── components/       # React components
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Utilities and configs
│       └── app/             # Next.js app directory
├── quic-stream/             # QUIC streaming service
│   └── python/
│       ├── server.py        # QUIC server
│       ├── client.py        # QUIC client example
│       └── requirements.txt
└── md/                      # Documentation
    ├── ARCHITECTURE.md
    ├── PHASE_*.md
    └── ...
```

---

## Contributing

This is a comprehensive project demonstrating advanced networking concepts. Contributions are welcome, especially in:

- Performance optimizations
- Additional protocol implementations
- Security enhancements
- Documentation improvements
- Test coverage
- Bug fixes

---

## License

[Specify your license here]

---

## Acknowledgments

- Socket.IO team for excellent WebSocket library
- aioquic developers for Python QUIC implementation
- Prometheus community for metrics standards
- MongoDB team for robust database solution

---

## Contact & Support

For questions, issues, or contributions, please refer to the project repository or contact the maintainers.

---

**Last Updated**: 2024
**Version**: 1.5.2
**Status**: Production Ready (with known limitations)
