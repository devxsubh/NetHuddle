import { v4 as uuidv4 } from 'uuid';

export interface FileTransferOptions {
  file: File;
  socket: any; // Socket.IO instance
  recipientId?: string;
  roomId?: string;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  onComplete?: (filePath: string) => void;
  onError?: (error: Error) => void;
}

export interface FileChunk {
  transferId: string;
  chunkIndex: number;
  totalChunks: number;
  data: ArrayBuffer;
  fileName: string;
  fileSize: number;
  fileType: string;
  recipientId?: string;
  roomId?: string;
}

/**
 * Transfer file via WebSocket (chunked)
 * Note: Browsers cannot use TCP directly, so we use WebSocket for file transfer
 * The server can optionally use TCP for server-to-server transfers
 */
export async function transferFileViaWebSocket(options: FileTransferOptions): Promise<string> {
  const {
    file,
    socket,
    recipientId,
    roomId,
    chunkSize = 64 * 1024, // 64KB default
    onProgress,
    onComplete,
    onError,
  } = options;

  return new Promise((resolve, reject) => {
    const transferId = uuidv4();
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    let bytesSent = 0;

    // Notify transfer start
    socket.emit('file:transfer:start', {
      transferId,
      fileName: file.name,
      fileSize: file.size,
      recipientId,
      roomId,
    });

    // Read and send chunks
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      if (e.target?.result) {
        const chunkData = e.target.result as ArrayBuffer;
        
        // Send chunk via WebSocket
        socket.emit('file:transfer:chunk', {
          transferId,
          chunkIndex: currentChunk,
          totalChunks,
          data: Array.from(new Uint8Array(chunkData)),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          recipientId,
          roomId,
        });

        bytesSent += chunkData.byteLength;
        currentChunk++;

        // Update progress
        const progress = (bytesSent / file.size) * 100;
        if (onProgress) {
          onProgress(progress);
        }

        // Read next chunk if not complete
        if (currentChunk < totalChunks) {
          readNextChunk();
        } else {
          // All chunks sent, wait for server confirmation
          socket.once('file:transfer:server-complete', (data: any) => {
            if (data.transferId === transferId && data.success) {
              if (onComplete) {
                onComplete(data.filePath);
              }
              resolve(data.filePath);
            }
          });
        }
      }
    };

    fileReader.onerror = (error) => {
      const err = new Error(`File read error: ${error}`);
      if (onError) onError(err);
      reject(err);
    };

    // Listen for server progress updates
    socket.on('file:transfer:progress', (data: any) => {
      if (data.transferId === transferId && data.progress !== undefined) {
        if (onProgress) {
          onProgress(data.progress);
        }
      }
    });

    // Listen for errors
    socket.on('file:transfer:error', (data: any) => {
      if (data.transferId === transferId) {
        const err = new Error(data.error || 'File transfer failed');
        if (onError) onError(err);
        reject(err);
      }
    });

    // Start reading first chunk
    function readNextChunk() {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      fileReader.readAsArrayBuffer(blob);
    }

    readNextChunk();
  });
}

/**
 * Chunk file for transfer
 */
export function chunkFile(file: File, chunkSize: number = 64 * 1024): Blob[] {
  const chunks: Blob[] = [];
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }

  return chunks;
}

/**
 * Calculate file checksum (simple hash)
 */
export async function calculateFileChecksum(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

