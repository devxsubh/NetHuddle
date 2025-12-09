import _ from 'lodash';
import NetworkSession from '~/models/networkSessionModel';
import { getClientIpAddress, getNetworkSubnet } from '~/utils/networkUtils';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';

/**
 * Get all active users in the same network as the current user
 */
export const getNetworkUsers = async (req, res) => {
	const clientIp = getClientIpAddress(req);
	const networkSubnet = getNetworkSubnet(clientIp);
	
	// Validate req.user exists
	if (!req.user) {
		throw new APIError('User not authenticated', httpStatus.UNAUTHORIZED);
	}
	
	const currentUserId = req.user._id || req.user.id;
	
	if (!currentUserId) {
		throw new APIError('Invalid user ID', httpStatus.BAD_REQUEST);
	}

	// Ensure current user's session is created/updated
	const userAgent = req.headers['user-agent'];
	await NetworkSession.createOrUpdateSession(currentUserId, clientIp, networkSubnet, userAgent);

	// Get all active sessions in the same network (excluding current user)
	const sessions = await NetworkSession.getActiveSessionsByNetwork(networkSubnet, currentUserId);

	// Transform the data to return user information
	// Filter out sessions with null users (in case user was deleted)
		const networkUsers = sessions
		.filter((session) => session.user && session.user._id) // Filter out null users
		.map((session) => {
			const user = session.user;
			return {
				userId: user._id || user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				userName: user.userName,
				avatar: user.avatar,
				lastSeen: session.lastSeen,
				ipAddress: session.ipAddress,
				userAgent: session.userAgent
			};
		});

	return res.json({
		success: true,
		data: {
			users: networkUsers,
			networkInfo: {
				networkSubnet,
				yourIpAddress: clientIp,
				totalUsers: networkUsers.length + 1 // +1 for current user
			}
		}
	});
};

/**
 * Update last seen timestamp for current user's network session
 * This keeps the user active in the network
 */
export const updateNetworkPresence = async (req, res) => {
	const clientIp = getClientIpAddress(req);
	const networkSubnet = getNetworkSubnet(clientIp);
	
	// Validate req.user exists
	if (!req.user) {
		throw new APIError('User not authenticated', httpStatus.UNAUTHORIZED);
	}
	
	const currentUserId = req.user._id || req.user.id;
	
	if (!currentUserId) {
		throw new APIError('Invalid user ID', httpStatus.BAD_REQUEST);
	}

	await NetworkSession.updateLastSeen(currentUserId, clientIp);

	return res.json({
		success: true,
		message: 'Presence updated'
	});
};

/**
 * Get network statistics
 */
export const getNetworkStats = async (req, res) => {
	const clientIp = getClientIpAddress(req);
	const networkSubnet = getNetworkSubnet(clientIp);

	// Get all sessions in the network (including current user)
	const allSessions = await NetworkSession.getActiveSessionsByNetwork(networkSubnet);

	return res.json({
		success: true,
		data: {
			networkSubnet,
			yourIpAddress: clientIp,
			activeUsers: allSessions.length,
			timestamp: new Date()
		}
	});
};

export default { getNetworkUsers, updateNetworkPresence, getNetworkStats };

