import NetworkSession from '~/models/networkSessionModel';
import { getClientIpAddress, getNetworkSubnet } from '~/utils/networkUtils';

/**
 * Middleware to automatically track user's network session
 * Updates lastSeen timestamp for authenticated users
 */
const trackNetwork = async (req, res, next) => {
	// Only track if user is authenticated
	if (req.user && req.user.id) {
		try {
			const clientIp = getClientIpAddress(req);
			const networkSubnet = getNetworkSubnet(clientIp);
			const userAgent = req.headers['user-agent'];

			// Update or create network session
			await NetworkSession.createOrUpdateSession(req.user.id, clientIp, networkSubnet, userAgent);
		} catch (error) {
			// Don't block the request if network tracking fails
			console.error('Error tracking network session:', error);
		}
	}
	next();
};

export default trackNetwork;
