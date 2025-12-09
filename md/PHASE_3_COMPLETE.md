# Phase 3: TCP/WebSocket Chat + File Transfer ✅

## What Has Been Implemented

### 1. TCP Socket Server ✅

**File**: `Server/src/services/tcpServer.js`

- ✅ TCP server on port 3001 (configurable via `TCP_PORT`)
- ✅ JWT authentication for TCP connections
- ✅ File transfer with chunking support
- ✅ Progress tracking for active transfers
- ✅ File storage in `uploads/` directory
- ✅ Transfer status management

**Features**:
- Accepts file transfers via TCP socket
- Validates JWT token in header
- Streams file data in chunks
- Tracks transfer progress
- Stores files with unique transfer IDs

### 2. File Transfer API ✅

**Files**:
- `Server/src/controllers/fileTransferController.js`
- `Server/src/routes/v1/fileTransferRoute.js`

**Endpoints**:
```
GET  /api/v1/file-transfer/:transferId  - Get transfer status
GET  /api/v1/file-transfer              - Get all my transfers
```

### 3. WebSocket File Transfer Events ✅

**File**: `Server/src/config/socket.js`

**Events Added**:
```
Client → Server:
  - 'file:transfer:start'      - Notify transfer start
  - 'file:transfer:chunk'      - Send file chunk
  - 'file:transfer:progress'  - Update progress

Server → Client:
  - 'file:transfer:started'   - Transfer started notification
  - 'file:transfer:progress'  - Progress update
  - 'file:transfer:completed' - Transfer completed
  - 'file:transfer:error'     - Transfer error
```

### 4. Client File Transfer Utilities ✅

**File**: `Client/src/lib/shared/utils/fileTransfer.ts`

**Functions**:
- `transferFileViaWebSocket()` - Transfer file via WebSocket (chunked)
- `chunkFile()` - Split file into chunks
- `calculateFileChecksum()` - Calculate SHA-256 checksum

**Note**: Browsers cannot use TCP directly, so client uses WebSocket for file transfer. The server can use TCP for server-to-server transfers.

### 5. File Serving ✅

- ✅ Added `/uploads` route to serve uploaded files
- ✅ Files accessible via HTTP: `http://localhost:666/uploads/{transferId}_{fileName}`

## Configuration

### Environment Variables

Add to `.env`:
```env
TCP_PORT=3001
```

### Server Initialization

The TCP server is automatically initialized when the main server starts:
```javascript
// Server/src/index.js
initializeTCPServer();
```

## File Transfer Flow

### WebSocket Transfer (Browser Client)

1. **Client** reads file in chunks
2. **Client** sends chunks via WebSocket (`file:transfer:chunk`)
3. **Server** receives chunks and stores them
4. **Server** sends progress updates
5. **Server** notifies completion with file path

### TCP Transfer (Native Client/Server-to-Server)

1. **Client** connects to TCP server (port 3001)
2. **Client** sends header (JSON with metadata + JWT)
3. **Server** validates JWT and creates file stream
4. **Client** sends file data in chunks
5. **Server** writes chunks to file
6. **Server** sends progress updates
7. **Server** sends completion message

## Usage Examples

### WebSocket File Transfer (Client)

```typescript
import { transferFileViaWebSocket } from '@/lib/shared/utils/fileTransfer';
import { useSocket } from '@/context/socket.context';

const socket = useSocket();
const file = // ... file from input

await transferFileViaWebSocket({
  file,
  socket,
  recipientId: 'user-id', // Optional: direct transfer
  roomId: 'room-id',        // Optional: room transfer
  chunkSize: 64 * 1024,     // 64KB chunks
  onProgress: (progress) => {
    console.log(`Progress: ${progress}%`);
  },
  onComplete: (filePath) => {
    console.log(`File saved at: ${filePath}`);
  },
  onError: (error) => {
    console.error('Transfer failed:', error);
  },
});
```

### TCP File Transfer (Node.js Client)

```javascript
const net = require('net');
const fs = require('fs');

const socket = new net.Socket();
const filePath = './example.pdf';
const fileStats = fs.statSync(filePath);
const fileStream = fs.createReadStream(filePath);

// Prepare header
const header = {
  token: 'YOUR_JWT_TOKEN',
  fileName: 'example.pdf',
  fileSize: fileStats.size,
  fileType: 'application/pdf',
  transferId: 'unique-transfer-id',
  recipientId: 'user-id',
  chunkSize: 64 * 1024
};

socket.connect(3001, 'localhost', () => {
  // Send header
  socket.write(JSON.stringify(header) + '\n');
  
  // Send file data
  fileStream.on('data', (chunk) => {
    socket.write(chunk);
  });
  
  fileStream.on('end', () => {
    socket.end();
  });
});

socket.on('data', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Server response:', response);
});
```

## File Storage

- **Location**: `Server/uploads/`
- **Naming**: `{transferId}_{fileName}`
- **Access**: `http://localhost:666/uploads/{transferId}_{fileName}`

## Security

- ✅ JWT authentication required for all transfers
- ✅ User can only access their own transfers
- ✅ File size validation (can be added)
- ✅ File type validation (can be added)

## Next Steps

### Enhancements to Consider

1. **File Size Limits**: Add max file size validation
2. **File Type Validation**: Whitelist allowed file types
3. **Resume Support**: Allow resuming interrupted transfers
4. **Checksum Verification**: Verify file integrity after transfer
5. **Compression**: Compress files before transfer
6. **Encryption**: Encrypt files during transfer
7. **Progress Persistence**: Store progress in database for resume

### Phase 4: P2P Audio/Video (WebRTC)

Ready to proceed with:
- WebRTC PeerConnection implementation
- Media stream capture
- STUN/TURN configuration
- Video/audio UI components

## Testing

### Test TCP Server

```bash
# Using netcat (nc)
echo '{"token":"JWT_TOKEN","fileName":"test.txt","fileSize":10,"fileType":"text/plain","transferId":"test-123","chunkSize":1024}\nHello World' | nc localhost 3001
```

### Test WebSocket Transfer

Use the browser console or a React component to test WebSocket file transfer.

## Notes

- TCP server is primarily for server-to-server or native client transfers
- Browser clients use WebSocket for file transfer (browsers don't support raw TCP)
- Files are stored temporarily in `uploads/` directory
- Consider adding file cleanup for old transfers
- Consider adding file metadata to database for better management

