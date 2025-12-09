/**
 * Socket.IO Service
 * Provides a singleton instance of the WebSocket server
 */
let ioInstance = null;

export function setSocketInstance(io) {
	ioInstance = io;
}

export function getSocketInstance() {
	return ioInstance;
}

/**
 * Emit event to a specific user
 */
export function emitToUser(userId, event, data) {
	if (!ioInstance) {
		return false;
	}
	ioInstance.to(`user:${userId}`).emit(event, data);
	return true;
}

/**
 * Emit event to all users in a network
 */
export function emitToNetwork(networkSubnet, event, data) {
	if (!ioInstance) {
		return false;
	}
	ioInstance.to(`network:${networkSubnet}`).emit(event, data);
	return true;
}

/**
 * Broadcast event to all connected users
 */
export function broadcast(event, data) {
	if (!ioInstance) {
		return false;
	}
	ioInstance.emit(event, data);
	return true;
}

export default {
	setSocketInstance,
	getSocketInstance,
	emitToUser,
	emitToNetwork,
	broadcast
};

