# Multi-Protocol Network Communication System

A real-time, multi-protocol network communication system that enables users to interact through chat, file sharing, and video streaming. The system operates in both client-server and peer-to-peer (P2P) modes, demonstrating the effective use of different communication protocols—TCP, UDP, WebSocket, and QUIC (HTTP/3)—for various networking tasks.

## 🎯 Purpose

The purpose of this project is to design and implement a real-time, multi-protocol network communication system that allows users to interact through chat, file sharing, and video streaming. The system will operate in both client-server and peer-to-peer (P2P) modes, demonstrating how different communication protocols—TCP, UDP, WebSocket, and QUIC (HTTP/3)—can be used effectively for various networking tasks.

## 💡 Vision

The vision is to showcase a modern, low-latency communication architecture that integrates emerging technologies like QUIC for faster and more secure data transmission. This project embodies the essence of practical networking by demonstrating real-world trade-offs between reliability, latency, and scalability.

## ✨ Features

- **Multi-Protocol Support**
  - **TCP**: Reliable, connection-oriented communication
  - **UDP**: Low-latency, connectionless communication
  - **WebSocket**: Real-time bidirectional communication
  - **QUIC/HTTP3**: Modern protocol with improved performance and security

- **Communication Modes**
  - **Client-Server**: Traditional centralized architecture
  - **Peer-to-Peer (P2P)**: Decentralized direct communication

- **Core Functionality**
  - Real-time chat messaging
  - File sharing and transfer
  - Video streaming capabilities
  - Low-latency communication

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Protocols](#protocols)
- [Development](#development)
- [License](#license)

## 🚀 Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (for data persistence)

### Clone the Repository

```bash
git clone https://github.com/devxsubh/NetHuddle.git
cd NetHuddle
```

### Install Dependencies

```bash
npm install
```

### Environment Setup

Copy the environment example file and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```bash
# App Configuration
APP_NAME=NetHuddle
NODE_ENV=development
HOST=0.0.0.0
PORT=666

# Database
DATABASE_URI=mongodb://127.0.0.1:27017/nethuddle

# JWT Configuration
JWT_ACCESS_TOKEN_SECRET_PRIVATE=
JWT_ACCESS_TOKEN_SECRET_PUBLIC=
JWT_ACCESS_TOKEN_EXPIRATION_MINUTES=240

# Frontend URL
FRONTEND_URL=http://localhost:777
```

## ⚙️ Configuration

### Protocol Configuration

The system supports multiple protocols, each optimized for specific use cases:

- **TCP**: Best for reliable data transfer (chat messages, file transfers)
- **UDP**: Ideal for low-latency requirements (real-time status updates)
- **WebSocket**: Perfect for bidirectional real-time communication (chat, notifications)
- **QUIC**: Modern protocol for enhanced performance and security (video streaming, large file transfers)

### Mode Configuration

Configure the system to run in either client-server or P2P mode through environment variables or runtime configuration.

## 💻 Usage

### Development Mode

```bash
npm start
# or
npm run dev
```

The server will start on `http://localhost:666` (or your configured port).

### Production Mode

```bash
# Build the project
npm run build

# Start in production
npm run prod
```

### Running with PM2

```bash
pm2 start ecosystem.config.js --env production
```

## 📁 Project Structure

```
src/
├── config/          # Environment variables and configuration
│   ├── config.js    # Main configuration
│   ├── logger.js    # Logging configuration
│   ├── mongoose.js  # Database connection
│   └── passport.js  # Authentication setup
├── controllers/     # Route controllers
│   ├── authController.js
│   ├── userController.js
│   ├── roleController.js
│   └── imageController.js
├── middlewares/     # Express middlewares
│   ├── authenticate.js
│   ├── error.js
│   ├── rateLimiter.js
│   ├── validate.js
│   └── uploadImage.js
├── models/          # Database models
│   ├── userModel.js
│   ├── roleModel.js
│   ├── tokenModel.js
│   └── permissionModel.js
├── routes/          # API routes
│   └── v1/
│       ├── authRoute.js
│       ├── userRoute.js
│       ├── roleRoute.js
│       └── imageRoute.js
├── services/        # Business logic services
│   ├── jwtService.js
│   ├── tokenService.js
│   └── emailService/
├── utils/           # Utility functions
│   ├── apiError.js
│   ├── catchAsync.js
│   └── resizeImage.js
├── validations/     # Request validation schemas
│   ├── authValidation.js
│   ├── userValidation.js
│   ├── roleValidation.js
│   └── customValidation.js
├── app.js           # Express app configuration
└── index.js         # Application entry point
```

## 🏗️ Architecture

### Client-Server Mode

In client-server mode, all communication flows through a central server that manages connections, routes messages, and handles file transfers. This mode provides:

- Centralized control and management
- Easier security and authentication
- Better scalability with proper server infrastructure
- Simplified NAT traversal

### Peer-to-Peer Mode

P2P mode enables direct communication between clients, reducing latency and server load. Features include:

- Direct client-to-client connections
- Reduced server bandwidth requirements
- Lower latency for real-time communication
- Distributed architecture

### Protocol Selection Strategy

- **Chat Messages**: WebSocket or QUIC for real-time bidirectional communication
- **File Transfers**: TCP or QUIC for reliable delivery
- **Video Streaming**: QUIC for optimized multimedia transfer
- **Status Updates**: UDP for low-latency, best-effort delivery

## 🔌 Protocols

### TCP (Transmission Control Protocol)
- **Use Case**: Reliable file transfers, critical messages
- **Advantages**: Guaranteed delivery, ordered packets
- **Trade-offs**: Higher latency, connection overhead

### UDP (User Datagram Protocol)
- **Use Case**: Real-time status updates, presence indicators
- **Advantages**: Low latency, connectionless
- **Trade-offs**: No guaranteed delivery, possible packet loss

### WebSocket
- **Use Case**: Real-time chat, notifications, live updates
- **Advantages**: Bidirectional, low overhead, HTTP-based
- **Trade-offs**: Requires persistent connection, more complex than HTTP

### QUIC (HTTP/3)
- **Use Case**: Video streaming, large file transfers, modern applications
- **Advantages**: Built-in encryption, faster connection setup, multiplexing
- **Trade-offs**: Newer protocol, varying browser/server support

## 🛠️ Development

### Code Style

The project uses ESLint with Airbnb configuration and Prettier for code formatting.

```bash
# Check code style
npm run lint

# Fix code style issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/signin` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh-tokens` - Refresh authentication tokens
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/me` - Update current user profile

### Users
- `POST /api/v1/users` - Create a new user
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:userId` - Get user by ID
- `PUT /api/v1/users/:userId` - Update user
- `DELETE /api/v1/users/:userId` - Delete user

### Roles
- `POST /api/v1/roles` - Create a new role
- `GET /api/v1/roles` - Get all roles
- `GET /api/v1/roles/:roleId` - Get role by ID
- `PUT /api/v1/roles/:roleId` - Update role
- `DELETE /api/v1/roles/:roleId` - Delete role

### Images
- `POST /api/v1/images/upload` - Upload an image

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT](LICENSE)

---

**Note**: This project demonstrates practical networking concepts and protocol implementations. It serves as an educational resource for understanding how different protocols can be leveraged for various communication needs.
