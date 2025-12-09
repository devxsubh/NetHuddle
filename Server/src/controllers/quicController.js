import httpStatus from 'http-status';
import catchAsync from '~/utils/catchAsync';
import quicService from '~/services/quicService';
import APIError from '~/utils/apiError';

/**
 * Get QUIC server connection information
 * Returns endpoint details for clients to connect to QUIC streaming server
 */
export const getQuicServerInfo = catchAsync(async (req, res) => {
	const userId = req.user._id || req.user.id;
	
	if (!userId) {
		throw new APIError('User not authenticated', httpStatus.UNAUTHORIZED);
	}

	const serverInfo = quicService.getQuicServerInfo();
	
	return res.json({
		success: true,
		data: {
			...serverInfo,
			// Include user-specific token for authentication
			authToken: quicService.generateStreamingToken(userId, `stream-${Date.now()}`)
		}
	});
});

/**
 * Generate a streaming session token
 * Clients use this token to authenticate with QUIC server
 */
export const createStreamingSession = catchAsync(async (req, res) => {
	const userId = req.user._id || req.user.id;
	const { streamId } = req.body;

	if (!userId) {
		throw new APIError('User not authenticated', httpStatus.UNAUTHORIZED);
	}

	const sessionToken = quicService.generateStreamingToken(
		userId,
		streamId || `stream-${userId}-${Date.now()}`
	);

	return res.json({
		success: true,
		data: {
			sessionToken: sessionToken.token,
			expiresAt: sessionToken.expiresAt,
			streamId: sessionToken.streamId,
			quicServer: quicService.getQuicServerInfo()
		}
	});
});

/**
 * Health check for QUIC server integration
 */
export const checkQuicHealth = catchAsync(async (req, res) => {
	const health = await quicService.checkQuicServerHealth();
	
	return res.json({
		success: true,
		data: health
	});
});

export default {
	getQuicServerInfo,
	createStreamingSession,
	checkQuicHealth,
};

