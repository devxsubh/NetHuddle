import net from 'net';
import fs from 'fs';
import path from 'path';
import logger from '~/config/logger';
import config from '~/config/config';
import jwt from 'jsonwebtoken';
import User from '~/models/userModel';

// Store active file transfers
const activeTransfers = new Map();

/**
 * Initialize TCP server for file transfers
 */
export function initializeTCPServer() {
	const server = net.createServer((socket) => {
		let transferId = null;
		let fileInfo = null;
		let fileStream = null;
		let receivedBytes = 0;
		let buffer = Buffer.alloc(0);
		let headerReceived = false;
		let headerSize = 0;

		logger.info('TCP: New connection from', socket.remoteAddress);

		socket.on('data', async (data) => {
			try {
				buffer = Buffer.concat([buffer, data]);

				// First, receive the header (JSON with file metadata)
				if (!headerReceived) {
					// Try to find the header delimiter (newline)
					const newlineIndex = buffer.indexOf('\n');
					if (newlineIndex === -1) {
						// Header not complete yet, wait for more data
						return;
					}

					// Parse header
					const headerBuffer = buffer.slice(0, newlineIndex);
					const headerString = headerBuffer.toString('utf-8');
					const header = JSON.parse(headerString);

					// Verify JWT token
					try {
						const decoded = jwt.verify(header.token, config.JWT_ACCESS_TOKEN_SECRET_PUBLIC, {
							algorithms: ['RS256']
						});
						const user = await User.getUserById(decoded.sub);
						if (!user) {
							socket.write(JSON.stringify({ success: false, error: 'Invalid user' }) + '\n');
							socket.end();
							return;
						}

						socket.user = user;
						socket.userId = user._id || user.id;
					} catch (error) {
						socket.write(JSON.stringify({ success: false, error: 'Invalid token' }) + '\n');
						socket.end();
						return;
					}

					// Extract file info from header
					fileInfo = {
						fileName: header.fileName,
						fileSize: header.fileSize,
						fileType: header.fileType,
						transferId: header.transferId,
						recipientId: header.recipientId,
						chunkSize: header.chunkSize || 1024 * 64 // 64KB default
					};

					transferId = fileInfo.transferId;
					headerReceived = true;
					headerSize = newlineIndex + 1;

					// Create uploads directory if it doesn't exist
					const uploadsDir = path.join(process.cwd(), 'uploads');
					if (!fs.existsSync(uploadsDir)) {
						fs.mkdirSync(uploadsDir, { recursive: true });
					}

					// Create file stream for writing
					const filePath = path.join(uploadsDir, `${transferId}_${fileInfo.fileName}`);
					fileStream = fs.createWriteStream(filePath);

					// Store transfer info
					activeTransfers.set(transferId, {
						userId: socket.userId,
						fileName: fileInfo.fileName,
						fileSize: fileInfo.fileSize,
						receivedBytes: 0,
						status: 'receiving',
						startTime: Date.now()
					});

					// Remove header from buffer
					buffer = buffer.slice(headerSize);

					// Send acknowledgment
					socket.write(
						JSON.stringify({
							success: true,
							transferId,
							message: 'File transfer started'
						}) + '\n'
					);

					logger.info(`TCP: File transfer started - ${fileInfo.fileName} (${fileInfo.fileSize} bytes)`);
				}

				// Write file data
				if (fileStream && buffer.length > 0) {
					fileStream.write(buffer);
					receivedBytes += buffer.length;
					buffer = Buffer.alloc(0);

					// Update transfer progress
					if (activeTransfers.has(transferId)) {
						const transfer = activeTransfers.get(transferId);
						transfer.receivedBytes = receivedBytes;
						transfer.progress = (receivedBytes / fileInfo.fileSize) * 100;
					}

					// Send progress update
					socket.write(
						JSON.stringify({
							success: true,
							transferId,
							progress: (receivedBytes / fileInfo.fileSize) * 100,
							receivedBytes,
							totalBytes: fileInfo.fileSize
						}) + '\n'
					);

					// Check if transfer is complete
					if (receivedBytes >= fileInfo.fileSize) {
						fileStream.end();
						activeTransfers.delete(transferId);

						socket.write(
							JSON.stringify({
								success: true,
								transferId,
								message: 'File transfer completed',
								filePath: `/uploads/${transferId}_${fileInfo.fileName}`,
								fileSize: receivedBytes
							}) + '\n'
						);

						logger.info(`TCP: File transfer completed - ${fileInfo.fileName} (${receivedBytes} bytes)`);
					}
				}
			} catch (error) {
				logger.error(`TCP: Error handling data: ${error.message}`);
				if (fileStream) {
					fileStream.destroy();
				}
				if (transferId) {
					activeTransfers.delete(transferId);
				}
				socket.write(JSON.stringify({ success: false, error: error.message }) + '\n');
				socket.end();
			}
		});

		socket.on('error', (error) => {
			logger.error(`TCP: Socket error: ${error.message}`);
			if (fileStream) {
				fileStream.destroy();
			}
			if (transferId) {
				activeTransfers.delete(transferId);
			}
		});

		socket.on('close', () => {
			logger.info('TCP: Connection closed');
			if (fileStream) {
				fileStream.destroy();
			}
			if (transferId) {
				activeTransfers.delete(transferId);
			}
		});
	});

	const PORT = config.TCP_PORT || 3001;
	server.listen(PORT, () => {
		logger.info(`TCP Server listening on port ${PORT}`);
	});

	server.on('error', (error) => {
		logger.error(`TCP Server error: ${error.message}`);
	});

	return server;
}

/**
 * Get active transfer status
 */
export function getTransferStatus(transferId) {
	return activeTransfers.get(transferId) || null;
}

/**
 * Get all active transfers for a user
 */
export function getUserTransfers(userId) {
	const userTransfers = [];
	activeTransfers.forEach((transfer, transferId) => {
		if (transfer.userId.toString() === userId.toString()) {
			userTransfers.push({ transferId, ...transfer });
		}
	});
	return userTransfers;
}

export default {
	initializeTCPServer,
	getTransferStatus,
	getUserTransfers
};
