import metricsService from '~/services/metricsService';

/**
 * Middleware to record HTTP request metrics
 */
export const metricsMiddleware = (req, res, next) => {
	const startTime = Date.now();

	// Record metrics when response finishes
	res.on('finish', () => {
		const duration = (Date.now() - startTime) / 1000; // Convert to seconds
		const method = req.method;
		const route = req.route?.path || req.path || 'unknown';
		const statusCode = res.statusCode;

		metricsService.recordHTTPRequest(method, route, statusCode, duration);
	});

	next();
};

export default { metricsMiddleware };

