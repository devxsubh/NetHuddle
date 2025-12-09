# Network Discovery Feature

This document describes the network discovery feature that allows users to see all people using the app on the same network.

## Overview

The network discovery feature automatically detects users on the same local network (same IP subnet) and provides an API to list all active users. This is useful for:
- Discovering nearby users
- Local peer-to-peer communication setup
- Network-based user presence

## How It Works

1. **Network Detection**: When users sign in or sign up, their IP address is captured and a network subnet is calculated (first 3 octets for IPv4, e.g., `192.168.1.0`).

2. **Session Tracking**: Each user's network session is tracked in the database with:
   - User ID
   - IP Address
   - Network Subnet
   - Last Seen timestamp
   - Active status

3. **Automatic Updates**: User presence is automatically updated on authenticated requests.

4. **Auto-Cleanup**: Inactive sessions older than 1 hour are automatically removed.

## API Endpoints

### 1. Get Users in Same Network

**Endpoint**: `GET /api/v1/network/users`

**Authentication**: Required (Bearer token)

**Description**: Returns all active users currently on the same network as the authenticated user.

**Response**:
```json
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
        "avatarUrl": "http://localhost:666/images/avatar.png",
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

### 2. Update Network Presence (Heartbeat)

**Endpoint**: `POST /api/v1/network/presence`

**Authentication**: Required (Bearer token)

**Description**: Updates the user's last seen timestamp to keep them active in the network. Can be called periodically (e.g., every 30 seconds) to maintain presence.

**Response**:
```json
{
  "success": true,
  "message": "Presence updated"
}
```

### 3. Get Network Statistics

**Endpoint**: `GET /api/v1/network/stats`

**Authentication**: Required (Bearer token)

**Description**: Returns statistics about the current network.

**Response**:
```json
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

## Usage Examples

### JavaScript/Node.js

```javascript
// Get users in same network
const response = await fetch('http://localhost:666/api/v1/network/users', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  }
});

const data = await response.json();
console.log('Users in network:', data.data.users);

// Update presence (heartbeat)
setInterval(async () => {
  await fetch('http://localhost:666/api/v1/network/presence', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
    }
  });
}, 30000); // Every 30 seconds
```

### cURL

```bash
# Get users in same network
curl -X GET http://localhost:666/api/v1/network/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Update presence
curl -X POST http://localhost:666/api/v1/network/presence \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Get network stats
curl -X GET http://localhost:666/api/v1/network/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Implementation Details

### Network Subnet Calculation

- **IPv4**: Uses first 3 octets (e.g., `192.168.1.0`)
- **IPv6**: Uses first 64 bits (simplified)
- **Localhost**: Handled separately (e.g., `127.0.0.1`)

### Session Lifecycle

1. **Creation**: Session created on signup/signin
2. **Update**: Last seen updated on authenticated requests (optional middleware)
3. **Deactivation**: Session deactivated on logout
4. **Expiration**: Inactive sessions removed after 1 hour

### Database Schema

The `NetworkSession` model stores:
- `user`: Reference to User model
- `ipAddress`: Client IP address
- `networkSubnet`: Calculated network subnet
- `userAgent`: Browser/client user agent
- `isActive`: Boolean flag for active status
- `lastSeen`: Timestamp of last activity

### IP Address Detection

The system handles various IP detection scenarios:
- Direct connection: Uses `req.connection.remoteAddress`
- Behind proxy: Checks `X-Forwarded-For` header
- Load balancer: Checks `X-Real-IP` header

## Security Considerations

1. **IP Address Privacy**: IP addresses are only visible to users on the same network
2. **Authentication**: All endpoints require authentication
3. **Rate Limiting**: Standard rate limiting applies
4. **Session Cleanup**: Old sessions are automatically cleaned up

## Future Enhancements

Possible improvements:
- WebSocket support for real-time presence updates
- Network grouping based on custom rules
- Privacy controls (opt-out of network discovery)
- Network-based chat channels
- File sharing within network

