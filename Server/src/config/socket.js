import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import config from './config';
import User from '~/models/userModel';
import NetworkSession from '~/models/networkSessionModel';
import NetworkFileShare from '~/models/networkFileShareModel';
import { getNetworkSubnet } from '~/utils/networkUtils';
import logger from './logger';
import { setSocketInstance } from '~/services/socketService';
import metricsService from '~/services/metricsService';

/**
 * Initialize WebSocket server
 */
export function initializeSocket(server) {
	// Socket.IO CORS configuration - must match Express CORS
	// Allow all origins to match Express CORS configuration
	const io = new Server(server, {
		cors: {
			origin: true, // Allow all origins
			methods: ['GET', 'POST'],
			credentials: true,
			allowedHeaders: ['Authorization', 'Content-Type']
		},
		transports: ['websocket', 'polling'],
		pingTimeout: 60000,
		pingInterval: 25000
	});

	// Authentication middleware for WebSocket
	io.use(async (socket, next) => {
		try {
			// Try multiple ways to get the token:
			// 1. From auth object (Socket.IO client standard)
			// 2. From Authorization header (Bearer token)
			// 3. From access_token header (Postman support)
			const token =
				socket.handshake.auth?.token ||
				socket.handshake.headers?.authorization?.split(' ')[1] ||
				socket.handshake.headers?.access_token ||
				socket.handshake.query?.token;

			if (!token) {
				return next(new Error('Authentication error: No token provided'));
			}

			// Verify JWT token
			const decoded = jwt.verify(token, config.JWT_ACCESS_TOKEN_SECRET_PUBLIC, {
				algorithms: ['RS256']
			});

			// Get user from database
			const user = await User.getUserById(decoded.sub);
			if (!user) {
				return next(new Error('Authentication error: User not found'));
			}

			// Attach user to socket
			socket.user = user;
			socket.userId = user._id || user.id;

			// Get client IP and network info - use same logic as HTTP middleware
			// Check for forwarded IP from proxy/load balancer
			const forwarded = socket.handshake.headers['x-forwarded-for'];
			let clientIp;
			if (forwarded) {
				const ips = forwarded.split(',');
				clientIp = ips[0].trim();
			} else {
				// Check for real IP header
				const realIp = socket.handshake.headers['x-real-ip'];
				if (realIp) {
					clientIp = realIp.trim();
				} else {
					// Fallback to socket address
					clientIp = socket.handshake.address || 
						socket.request.connection?.remoteAddress || 
						socket.request.socket?.remoteAddress ||
						'127.0.0.1';
				}
			}
			
			// Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
			if (clientIp && clientIp.startsWith('::ffff:')) {
				clientIp = clientIp.replace('::ffff:', '');
			}
			
			const networkSubnet = getNetworkSubnet(clientIp);
			const userAgent = socket.handshake.headers['user-agent'];
			
			logger.info(`Socket connection: User ${user.userName}, IP: ${clientIp}, Subnet: ${networkSubnet}`);

			// Register network session
			await NetworkSession.createOrUpdateSession(user.id, clientIp, networkSubnet, userAgent);

			// Store network info in socket
			socket.networkSubnet = networkSubnet;
			socket.clientIp = clientIp;
			socket.networkRoom = `network:${networkSubnet}`;

			next();
		} catch (error) {
			logger.error(`WebSocket authentication error: ${error.message}`);
			next(new Error('Authentication error'));
		}
	});

	// Connection handler
	io.on('connection', (socket) => {
		const user = socket.user;
		const networkRoom = socket.networkRoom;

		logger.info(`WebSocket: User ${user.userName} connected (socket ${socket.id})`);

		// Update WebSocket connections metric
		metricsService.updateWebSocketConnections(io.sockets.sockets.size);

		// Join network room
		socket.join(networkRoom);

		// Join user's personal room for direct messaging
		const userRoom = `user:${socket.userId}`;
		socket.join(userRoom);

		// Broadcast user online status to network
		socket.to(networkRoom).emit('user:online', {
			userId: socket.userId,
			userName: user.userName,
			firstName: user.firstName,
			lastName: user.lastName,
			avatar: user.avatar,
			avatarUrl: user.avatarUrl,
			ipAddress: socket.clientIp,
			timestamp: new Date()
		});

		// Handle getting network users
		socket.on('network:getUsers', async () => {
			const startTime = Date.now();
			try {
				const sessions = await NetworkSession.getActiveSessionsByNetwork(socket.networkSubnet, socket.userId);

				const networkUsers = sessions.map((session) => {
					const sessionUser = session.user;
					return {
						userId: sessionUser._id || sessionUser.id,
						firstName: sessionUser.firstName,
						lastName: sessionUser.lastName,
						userName: sessionUser.userName,
						avatar: sessionUser.avatar,
						avatarUrl: sessionUser.avatarUrl,
						lastSeen: session.lastSeen,
						ipAddress: session.ipAddress,
						userAgent: session.userAgent,
						isOnline: true
					};
				});

				// Include current user
				networkUsers.push({
					userId: user._id || user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					userName: user.userName,
					avatar: user.avatar,
					avatarUrl: user.avatarUrl,
					ipAddress: socket.clientIp,
					isOnline: true
				});

				// Update metrics
				metricsService.updateNetworkUsers(socket.networkSubnet, networkUsers.length);
				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('network:getUsers', duration);

				socket.emit('network:users', {
					users: networkUsers,
					networkInfo: {
						networkSubnet: socket.networkSubnet,
						yourIpAddress: socket.clientIp,
						totalUsers: networkUsers.length
					}
				});
			} catch (error) {
				logger.error(`Error getting network users: ${error.message}`);
				socket.emit('error', { message: 'Failed to get network users' });
			}
		});

		// Handle presence update (heartbeat)
		socket.on('presence:update', async () => {
			const startTime = Date.now();
			try {
				await NetworkSession.updateLastSeen(socket.userId, socket.clientIp);

				// Broadcast updated presence to network
				socket.to(networkRoom).emit('user:presence', {
					userId: socket.userId,
					userName: user.userName,
					lastSeen: new Date(),
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('presence:update', duration);

				socket.emit('presence:updated', {
					success: true,
					timestamp: new Date()
				});
			} catch (error) {
				logger.error(`Error updating presence: ${error.message}`);
				socket.emit('error', { message: 'Failed to update presence' });
			}
		});

		// Handle chat messages (ephemeral - only when both users are online on the same network)
		socket.on('chat:message', async (data) => {
			const startTime = Date.now();
			try {
				const { recipientId, message, type = 'text' } = data;

				if (!recipientId || !message) {
					return socket.emit('error', { message: 'Recipient ID and message are required' });
				}

				// Check if recipient is online (has active session on the same network)
				const recipientSession = await NetworkSession.findOne({
					user: recipientId,
					isActive: true,
					lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Active within last 15 minutes
				});

				if (!recipientSession) {
					return socket.emit('error', { message: 'Recipient is not online' });
				}

				// Send to recipient's personal room (ephemeral - not saved to DB)
				io.to(`user:${recipientId}`).emit('chat:message', {
					from: {
						userId: socket.userId,
						userName: user.userName,
						firstName: user.firstName,
						lastName: user.lastName,
						avatar: user.avatar,
						avatarUrl: user.avatarUrl
					},
					message,
					type,
					timestamp: new Date()
				});

				// Confirm to sender
				socket.emit('chat:sent', {
					success: true,
					recipientId,
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('chat:message', duration);
			} catch (error) {
				logger.error(`Error sending chat message: ${error.message}`);
				socket.emit('error', { message: 'Failed to send message' });
			}
		});

		// Handle broadcast to network
		socket.on('network:broadcast', async (data) => {
			const startTime = Date.now();
			try {
				const { message, type = 'notification' } = data;

				if (!message) {
					return socket.emit('error', { message: 'Message is required' });
				}

				// Broadcast to all users in the network
				socket.to(networkRoom).emit('network:broadcast', {
					from: {
						userId: socket.userId,
						userName: user.userName,
						firstName: user.firstName,
						lastName: user.lastName,
						avatar: user.avatar,
						avatarUrl: user.avatarUrl
					},
					message,
					type,
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('network:broadcast', duration);

				socket.emit('network:broadcast:sent', {
					success: true,
					timestamp: new Date()
				});
			} catch (error) {
				logger.error(`Error broadcasting to network: ${error.message}`);
				socket.emit('error', { message: 'Failed to broadcast' });
			}
		});

		// ========== ROOM MANAGEMENT ==========
		// Join a room
		socket.on('room:join', async (data) => {
			const startTime = Date.now();
			try {
				const { roomId } = data;

				if (!roomId) {
					return socket.emit('error', { message: 'Room ID is required' });
				}

				const roomName = `room:${roomId}`;
				socket.join(roomName);

				// Notify others in the room
				socket.to(roomName).emit('room:user-joined', {
					userId: socket.userId,
					userName: user.userName,
					firstName: user.firstName,
					lastName: user.lastName,
					avatar: user.avatar,
					avatarUrl: user.avatarUrl,
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('room:join', duration);

				socket.emit('room:joined', {
					success: true,
					roomId,
					timestamp: new Date()
				});

				logger.info(`User ${user.userName} joined room ${roomId}`);
			} catch (error) {
				logger.error(`Error joining room: ${error.message}`);
				socket.emit('error', { message: 'Failed to join room' });
			}
		});

		// Leave a room
		socket.on('room:leave', async (data) => {
			const startTime = Date.now();
			try {
				const { roomId } = data;

				if (!roomId) {
					return socket.emit('error', { message: 'Room ID is required' });
				}

				const roomName = `room:${roomId}`;
				socket.leave(roomName);

				// Notify others in the room
				socket.to(roomName).emit('room:user-left', {
					userId: socket.userId,
					userName: user.userName,
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('room:leave', duration);

				socket.emit('room:left', {
					success: true,
					roomId,
					timestamp: new Date()
				});

				logger.info(`User ${user.userName} left room ${roomId}`);
			} catch (error) {
				logger.error(`Error leaving room: ${error.message}`);
				socket.emit('error', { message: 'Failed to leave room' });
			}
		});

		// Send message to room
		socket.on('room:message', async (data) => {
			const startTime = Date.now();
			try {
				const { roomId, message, type = 'text' } = data;

				if (!roomId || !message) {
					return socket.emit('error', { message: 'Room ID and message are required' });
				}

				// Verify user is a member of the room
				const Room = (await import('~/models/roomModel')).default;
				const RoomMessage = (await import('~/models/roomMessageModel')).default;
				const room = await Room.getRoomById(roomId);

				if (!room) {
					return socket.emit('error', { message: 'Room not found' });
				}

				if (!room.isActive) {
					return socket.emit('error', { message: 'Room is not active' });
				}

				if (!room.isMember(socket.userId)) {
					return socket.emit('error', { message: 'You are not a member of this room' });
				}

				// Save message to database
				const savedMessage = await RoomMessage.createRoomMessage(roomId, socket.userId, message, type);

				const roomName = `room:${roomId}`;

				// Broadcast message to all members in the room (including sender)
				io.to(roomName).emit('room:message', {
					roomId,
					messageId: savedMessage._id.toString(),
					from: {
						userId: socket.userId,
						userName: user.userName,
						firstName: user.firstName,
						lastName: user.lastName,
						avatar: user.avatar,
						avatarUrl: user.avatarUrl
					},
					message,
					type,
					timestamp: savedMessage.createdAt
				});

				// Confirm to sender
				socket.emit('room:message:sent', {
					success: true,
					roomId,
					messageId: savedMessage._id.toString(),
					timestamp: savedMessage.createdAt
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('room:message', duration);

				logger.info(`User ${user.userName} sent message to room ${roomId}`);
			} catch (error) {
				logger.error(`Error sending room message: ${error.message}`);
				socket.emit('error', { message: 'Failed to send message to room' });
			}
		});

		// ========== WEBRTC SIGNALING ==========
		// Handle WebRTC offer (SDP) - only between friends
		socket.on('webrtc:offer', async (data) => {
			const startTime = Date.now();
			try {
				const { roomId, offer, targetUserId } = data;

				if (!offer) {
					return socket.emit('error', { message: 'SDP offer is required' });
				}

				const roomName = `room:${roomId}`;

				// Send offer to specific user or broadcast to room
				if (targetUserId) {
					// Check if recipient is online (on the same network)
					const recipientSession = await NetworkSession.findOne({
						user: targetUserId,
						isActive: true,
						lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
					});

					if (!recipientSession) {
						return socket.emit('error', { message: 'Recipient is not online' });
					}

					// Send to specific user
					io.to(`user:${targetUserId}`).emit('webrtc:offer', {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						offer,
						roomId,
						timestamp: new Date()
					});
				} else {
					// Broadcast to room (excluding sender) - room calls don't require friendship
					socket.to(roomName).emit('webrtc:offer', {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						offer,
						roomId,
						timestamp: new Date()
					});
				}

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('webrtc:offer', duration);

				logger.info(`WebRTC offer sent from ${user.userName} in room ${roomId}`);
			} catch (error) {
				logger.error(`Error handling WebRTC offer: ${error.message}`);
				socket.emit('error', { message: 'Failed to send WebRTC offer' });
			}
		});

		// Handle WebRTC answer (SDP)
		socket.on('webrtc:answer', (data) => {
			const startTime = Date.now();
			try {
				const { roomId, answer, targetUserId } = data;

				if (!answer) {
					return socket.emit('error', { message: 'SDP answer is required' });
				}

				if (!targetUserId) {
					return socket.emit('error', { message: 'Target user ID is required for answer' });
				}

				// Send answer to specific user
				io.to(`user:${targetUserId}`).emit('webrtc:answer', {
					from: {
						userId: socket.userId,
						userName: user.userName,
						avatar: user.avatar,
						avatarUrl: user.avatarUrl
					},
					answer,
					roomId,
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('webrtc:answer', duration);

				logger.info(`WebRTC answer sent from ${user.userName} to user ${targetUserId}`);
			} catch (error) {
				logger.error(`Error handling WebRTC answer: ${error.message}`);
				socket.emit('error', { message: 'Failed to send WebRTC answer' });
			}
		});

		// Handle ICE candidate exchange
		socket.on('webrtc:ice-candidate', (data) => {
			const startTime = Date.now();
			try {
				const { roomId, candidate, targetUserId } = data;

				if (!candidate) {
					return socket.emit('error', { message: 'ICE candidate is required' });
				}

				if (!targetUserId) {
					return socket.emit('error', { message: 'Target user ID is required for ICE candidate' });
				}

				// Send ICE candidate to specific user
				io.to(`user:${targetUserId}`).emit('webrtc:ice-candidate', {
					from: {
						userId: socket.userId,
						userName: user.userName
					},
					candidate,
					roomId,
					timestamp: new Date()
				});

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('webrtc:ice-candidate', duration);

				logger.debug(`ICE candidate sent from ${user.userName} to user ${targetUserId}`);
			} catch (error) {
				logger.error(`Error handling ICE candidate: ${error.message}`);
				socket.emit('error', { message: 'Failed to send ICE candidate' });
			}
		});

		// ========== FILE TRANSFER ==========
		// Notify about file transfer start
		socket.on('file:transfer:start', (data) => {
			const startTime = Date.now();
			try {
				const { transferId, fileName, fileSize, recipientId, roomId } = data;

				if (!transferId || !fileName || !fileSize) {
					return socket.emit('error', { message: 'Transfer ID, file name, and file size are required' });
				}

				// Notify recipient or room
				if (recipientId) {
					// Direct file transfer
					io.to(`user:${recipientId}`).emit('file:transfer:started', {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						transferId,
						fileName,
						fileSize,
						timestamp: new Date()
					});
				} else if (roomId) {
					// Room file transfer
					const roomName = `room:${roomId}`;
					socket.to(roomName).emit('file:transfer:started', {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						transferId,
						fileName,
						fileSize,
						roomId,
						timestamp: new Date()
					});
				}

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('file:transfer:start', duration);

				logger.info(`File transfer started: ${fileName} (${fileSize} bytes) by ${user.userName}`);
			} catch (error) {
				logger.error(`Error handling file transfer start: ${error.message}`);
				socket.emit('error', { message: 'Failed to notify file transfer' });
			}
		});

		// Notify about file transfer progress
		socket.on('file:transfer:progress', (data) => {
			try {
				const { transferId, progress, recipientId, roomId } = data;

				if (!transferId || progress === undefined) {
					return socket.emit('error', { message: 'Transfer ID and progress are required' });
				}

				// Notify recipient or room
				if (recipientId) {
					io.to(`user:${recipientId}`).emit('file:transfer:progress', {
						transferId,
						progress,
						timestamp: new Date()
					});
				} else if (roomId) {
					const roomName = `room:${roomId}`;
					socket.to(roomName).emit('file:transfer:progress', {
						transferId,
						progress,
						timestamp: new Date()
					});
				}
			} catch (error) {
				logger.error(`Error handling file transfer progress: ${error.message}`);
				socket.emit('error', { message: 'Failed to update file transfer progress' });
			}
		});

		// Notify about file transfer completion
		socket.on('file:transfer:complete', (data) => {
			const startTime = Date.now();
			try {
				const { transferId, fileName, filePath, fileSize, recipientId, roomId } = data;

				if (!transferId || !fileName) {
					return socket.emit('error', { message: 'Transfer ID and file name are required' });
				}

				// Notify recipient or room
				if (recipientId) {
					io.to(`user:${recipientId}`).emit('file:transfer:completed', {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						transferId,
						fileName,
						filePath,
						fileSize,
						timestamp: new Date()
					});
				} else if (roomId) {
					const roomName = `room:${roomId}`;
					socket.to(roomName).emit('file:transfer:completed', {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						transferId,
						fileName,
						filePath,
						fileSize,
						roomId,
						timestamp: new Date()
					});
				}

				const duration = (Date.now() - startTime) / 1000;
				metricsService.recordWebSocketMessage('file:transfer:complete', duration);
				metricsService.recordFileTransfer('completed', fileSize, duration);

				logger.info(`File transfer completed: ${fileName} by ${user.userName}`);
			} catch (error) {
				logger.error(`Error handling file transfer completion: ${error.message}`);
				socket.emit('error', { message: 'Failed to notify file transfer completion' });
			}
		});

		// Handle file transfer chunks (WebSocket)
		const fileTransferBuffers = new Map(); // Store chunks for each transfer

		socket.on('file:transfer:chunk', async (data) => {
			const startTime = Date.now();
			try {
				const { transferId, chunkIndex, totalChunks, data: chunkData, fileName, fileSize, fileType, recipientId, roomId } = data;

				if (!transferId || chunkIndex === undefined || !chunkData) {
					return socket.emit('file:transfer:error', {
						transferId,
						error: 'Invalid chunk data'
					});
				}

				// Initialize buffer for this transfer if not exists
				if (!fileTransferBuffers.has(transferId)) {
					fileTransferBuffers.set(transferId, {
						chunks: new Array(totalChunks),
						receivedChunks: 0,
						fileName,
						fileSize,
						fileType,
						recipientId,
						roomId,
						startTime: Date.now()
					});
				}

				const transfer = fileTransferBuffers.get(transferId);
				transfer.chunks[chunkIndex] = Buffer.from(chunkData);
				transfer.receivedChunks++;

				// Calculate progress
				const progress = (transfer.receivedChunks / totalChunks) * 100;

				// Send progress update
				if (recipientId) {
					io.to(`user:${recipientId}`).emit('file:transfer:progress', {
						transferId,
						progress,
						timestamp: new Date()
					});
				} else if (roomId) {
					const roomName = `room:${roomId}`;
					socket.to(roomName).emit('file:transfer:progress', {
						transferId,
						progress,
						timestamp: new Date()
					});
				} else {
					// Network-wide file share - broadcast to network room
					const networkRoom = socket.networkRoom;
					socket.to(networkRoom).emit('file:transfer:progress', {
						transferId,
						progress,
						timestamp: new Date()
					});
				}

				// Check if all chunks received
				if (transfer.receivedChunks === totalChunks) {
					// Combine all chunks
					const fileBuffer = Buffer.concat(transfer.chunks);

					// Save file (using fs)
					const uploadsDir = path.join(process.cwd(), 'uploads');
					if (!fs.existsSync(uploadsDir)) {
						fs.mkdirSync(uploadsDir, { recursive: true });
					}

					const filePath = path.join(uploadsDir, `${transferId}_${fileName}`);
					fs.writeFileSync(filePath, fileBuffer);

					// Clean up buffer
					fileTransferBuffers.delete(transferId);

					// Notify completion
					const fileUrl = `/uploads/${transferId}_${fileName}`;
					const transferDuration = (Date.now() - transfer.startTime) / 1000;

					// Record metrics
					metricsService.recordFileTransfer('completed', fileSize, transferDuration);

					// Save to network file shares if no specific recipient/room
					if (!recipientId && !roomId) {
						try {
							await NetworkFileShare.createFileShare(
								socket.userId,
								socket.networkSubnet,
								transferId,
								fileName,
								fileUrl,
								fileSize,
								fileType
							);
							logger.info(`File shared to network: ${fileName} by ${user.userName} on ${socket.networkSubnet}`);
						} catch (error) {
							logger.error(`Error saving network file share: ${error.message}`);
						}
					}

					const fileData = {
						from: {
							userId: socket.userId,
							userName: user.userName,
							avatar: user.avatar,
							avatarUrl: user.avatarUrl
						},
						transferId,
						fileName,
						filePath: fileUrl,
						fileSize,
						timestamp: new Date()
					};

					if (recipientId) {
						io.to(`user:${recipientId}`).emit('file:transfer:completed', fileData);
					} else if (roomId) {
						fileData.roomId = roomId;
						const roomName = `room:${roomId}`;
						socket.to(roomName).emit('file:transfer:completed', fileData);
					} else {
						// Network-wide file share - broadcast to network room
						fileData.isNetworkShare = true;
						const networkRoom = socket.networkRoom;
						socket.to(networkRoom).emit('file:transfer:completed', fileData);
						logger.info(`File broadcasted to network room ${networkRoom}: ${fileName}`);
					}

					// Confirm to sender
					socket.emit('file:transfer:server-complete', {
						success: true,
						transferId,
						filePath: fileUrl,
						timestamp: new Date()
					});

					const duration = (Date.now() - startTime) / 1000;
					metricsService.recordWebSocketMessage('file:transfer:chunk', duration);

					logger.info(`File transfer completed via WebSocket: ${fileName} (${fileSize} bytes) by ${user.userName}`);
				}
			} catch (error) {
				logger.error(`Error handling file transfer chunk: ${error.message}`);
				socket.emit('file:transfer:error', {
					transferId: data?.transferId,
					error: error.message
				});
			}
		});

		// Handle disconnect
		socket.on('disconnect', async () => {
			try {
				logger.info(`WebSocket: User ${user.userName} disconnected (socket ${socket.id})`);

				// Clean up file transfer buffers
				fileTransferBuffers.clear();

				// Update WebSocket connections metric
				metricsService.updateWebSocketConnections(io.sockets.sockets.size);

				// Broadcast user offline status to network
				socket.to(networkRoom).emit('user:offline', {
					userId: socket.userId,
					userName: user.userName,
					timestamp: new Date()
				});

				// Note: We don't deactivate the session on disconnect immediately
				// as the user might reconnect. Session will expire naturally.
			} catch (error) {
				logger.error(`Error handling disconnect: ${error.message}`);
			}
		});

		// Error handling
		socket.on('error', (error) => {
			logger.error(`WebSocket error for user ${user.userName}: ${error.message}`);
		});
	});

	// Store socket instance for use in other parts of the application
	setSocketInstance(io);

	return io;
}

export default { initializeSocket };
