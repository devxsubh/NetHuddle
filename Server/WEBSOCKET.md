# WebSocket Real-Time Communication

This document describes the WebSocket implementation for real-time network communication.

## Overview

The application uses Socket.IO as the primary WebSocket library to provide real-time bidirectional communication between clients and the server. WebSocket is the main architecture for all real-time features including network discovery, presence updates, and chat.

## Features

- **Real-time Network Discovery**: Automatically discover users in your network in real-time
- **Presence Updates**: Live presence tracking with automatic updates
- **Network Broadcasting**: Broadcast messages to all users in your network
- **Private Messaging**: Send direct messages to users in your network
- **Automatic Reconnection**: Handles connection drops gracefully
- **Authentication**: JWT-based authentication for WebSocket connections
- **Room Management**: Automatic room assignment based on network subnet

## Architecture

### Connection Flow

1. **Client Connection**: Client connects to WebSocket server with JWT token
2. **Authentication**: Server verifies JWT token and loads user data
3. **Network Detection**: Server detects user's network subnet from IP address
4. **Room Assignment**: User automatically joins network-specific room
5. **Presence Broadcast**: User's online status is broadcasted to network
6. **Event Handling**: Server handles real-time events from client

### Room Structure

- **Network Rooms**: `network:<subnet>` - All users on the same network
- **User Rooms**: `user:<userId>` - Personal room for direct messaging

## Client Implementation

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:666', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Network Discovery

#### Get Network Users

```javascript
// Request network users
socket.emit('network:getUsers');

// Receive network users
socket.on('network:users', (data) => {
  console.log('Users in network:', data.users);
  console.log('Network info:', data.networkInfo);
  
  // data.users contains array of:
  // {
  //   userId, firstName, lastName, userName,
  //   avatar, avatarUrl, ipAddress, lastSeen, isOnline
  // }
  
  // data.networkInfo contains:
  // {
  //   networkSubnet, yourIpAddress, totalUsers
  // }
});
```

#### User Online Event

```javascript
// Listen for users coming online
socket.on('user:online', (user) => {
  console.log('User came online:', user);
  // {
  //   userId, userName, firstName, lastName,
  //   avatar, avatarUrl, ipAddress, timestamp
  // }
  
  // Update your UI to show new user
  addUserToList(user);
});
```

#### User Offline Event

```javascript
// Listen for users going offline
socket.on('user:offline', (user) => {
  console.log('User went offline:', user);
  // {
  //   userId, userName, timestamp
  // }
  
  // Update your UI to remove user
  removeUserFromList(user.userId);
});
```

### Presence Updates

```javascript
// Send presence update (heartbeat)
socket.emit('presence:update');

// Confirm presence updated
socket.on('presence:updated', (data) => {
  console.log('Presence updated:', data);
  // {
  //   success: true, timestamp
  // }
});

// Listen for presence updates from other users
socket.on('user:presence', (data) => {
  console.log('User presence updated:', data);
  // {
  //   userId, userName, lastSeen, timestamp
  // }
  
  // Update last seen time in your UI
  updateUserLastSeen(data.userId, data.lastSeen);
});

// Send periodic presence updates (every 30 seconds)
setInterval(() => {
  socket.emit('presence:update');
}, 30000);
```

### Chat Messaging

#### Send Private Message

```javascript
// Send message to user in your network
socket.emit('chat:message', {
  recipientId: 'USER_ID',
  message: 'Hello!',
  type: 'text' // 'text', 'file', 'image', etc.
});

// Message sent confirmation
socket.on('chat:sent', (data) => {
  console.log('Message sent:', data);
  // {
  //   success: true, recipientId, timestamp
  // }
});

// Receive message from another user
socket.on('chat:message', (data) => {
  console.log('New message:', data);
  // {
  //   from: {
  //     userId, userName, firstName, lastName,
  //     avatar, avatarUrl
  //   },
  //   message, type, timestamp
  // }
  
  // Display message in your UI
  displayMessage(data);
});
```

#### Network Broadcast

```javascript
// Broadcast message to all users in your network
socket.emit('network:broadcast', {
  message: 'Hello everyone!',
  type: 'notification' // 'notification', 'announcement', etc.
});

// Broadcast sent confirmation
socket.on('network:broadcast:sent', (data) => {
  console.log('Broadcast sent:', data);
});

// Receive broadcast message
socket.on('network:broadcast', (data) => {
  console.log('Network broadcast:', data);
  // {
  //   from: { userId, userName, ... },
  //   message, type, timestamp
  // }
  
  // Display broadcast in your UI
  showNotification(data);
});
```

### Error Handling

```javascript
// Listen for errors
socket.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  // Handle error appropriately
});
```

## Server Events

### Emitted by Server

- `network:users` - List of users in network (response to `network:getUsers`)
- `user:online` - User came online
- `user:offline` - User went offline
- `user:presence` - User presence updated
- `presence:updated` - Presence update confirmation
- `chat:message` - Received chat message
- `chat:sent` - Message sent confirmation
- `network:broadcast` - Network broadcast message
- `network:broadcast:sent` - Broadcast sent confirmation
- `error` - Error occurred

### Handled by Server

- `network:getUsers` - Get all users in network
- `presence:update` - Update user presence
- `chat:message` - Send private message
- `network:broadcast` - Broadcast to network

## Authentication

WebSocket connections require JWT authentication. The token can be provided in two ways:

1. **Auth Object** (Recommended):
```javascript
const socket = io('http://localhost:666', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

2. **Authorization Header**:
```javascript
const socket = io('http://localhost:666', {
  extraHeaders: {
    Authorization: 'Bearer YOUR_JWT_TOKEN'
  }
});
```

If authentication fails, the connection will be rejected with an error.

## Network Detection

The server automatically detects the user's network based on their IP address:

- **IPv4**: Uses first 3 octets (e.g., `192.168.1.0`)
- **IPv6**: Uses first 64 bits
- **Proxy Support**: Handles `X-Forwarded-For` and `X-Real-IP` headers

Users are automatically grouped into network-specific rooms for efficient broadcasting.

## Example: Complete Implementation

```javascript
import { io } from 'socket.io-client';

class NetworkChat {
  constructor(token) {
    this.socket = io('http://localhost:666', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // Connection
    this.socket.on('connect', () => {
      console.log('Connected!');
      this.requestNetworkUsers();
      this.startPresenceUpdates();
    });
    
    // Network users
    this.socket.on('network:users', (data) => {
      this.updateUserList(data.users);
    });
    
    // User online/offline
    this.socket.on('user:online', (user) => {
      this.addUser(user);
    });
    
    this.socket.on('user:offline', (user) => {
      this.removeUser(user.userId);
    });
    
    // Chat messages
    this.socket.on('chat:message', (data) => {
      this.displayMessage(data);
    });
    
    // Errors
    this.socket.on('error', (error) => {
      console.error('Error:', error.message);
    });
  }
  
  requestNetworkUsers() {
    this.socket.emit('network:getUsers');
  }
  
  startPresenceUpdates() {
    // Update presence every 30 seconds
    setInterval(() => {
      this.socket.emit('presence:update');
    }, 30000);
  }
  
  sendMessage(recipientId, message) {
    this.socket.emit('chat:message', {
      recipientId,
      message,
      type: 'text'
    });
  }
  
  broadcastMessage(message) {
    this.socket.emit('network:broadcast', {
      message,
      type: 'notification'
    });
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const chat = new NetworkChat('YOUR_JWT_TOKEN');
```

## Best Practices

1. **Reconnection**: Always enable automatic reconnection
2. **Presence Updates**: Send presence updates periodically (every 30 seconds)
3. **Error Handling**: Always listen for error events
4. **Token Management**: Refresh tokens before they expire
5. **Rate Limiting**: Don't emit events too frequently
6. **Cleanup**: Disconnect sockets when not in use
7. **Room Management**: Let the server handle room assignments automatically

## Troubleshooting

### Connection Issues

- **Check Token**: Ensure JWT token is valid and not expired
- **CORS**: Verify CORS settings match your frontend URL
- **Network**: Check firewall and network settings
- **Server**: Verify server is running and WebSocket is initialized

### Authentication Errors

- Ensure token is provided in auth object or headers
- Check token format: `Bearer <token>` or just `<token>`
- Verify token is not expired
- Check user exists in database

### Events Not Received

- Verify you're listening to correct event names
- Check if you're in the same network room
- Ensure server is emitting to correct room
- Check browser console for errors

## Security Considerations

1. **Authentication**: All connections require valid JWT tokens
2. **Network Isolation**: Users can only see users in their network
3. **Message Validation**: Server validates all incoming messages
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Input Sanitization**: Sanitize all user inputs before processing

## Performance

- **Connection Pooling**: Socket.IO handles multiple connections efficiently
- **Room-Based Broadcasting**: Only broadcasts to relevant network rooms
- **Automatic Cleanup**: Inactive sessions are automatically cleaned up
- **Scalability**: Use Redis adapter for multi-server deployments

## Future Enhancements

- File transfer over WebSocket
- Video streaming support
- Screen sharing
- Voice chat
- End-to-end encryption
- Message persistence
- Typing indicators
- Read receipts

