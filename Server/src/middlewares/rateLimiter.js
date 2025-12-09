import rateLimit from 'express-rate-limit';
import httpStatus from 'http-status';
import APIError from '~/utils/apiError';

const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 300, // Tripled from 100 to 300 requests per 15 minutes
	// Skip rate limiting for OPTIONS requests (CORS preflight)
	skip: (req) => req.method === 'OPTIONS',
	handler: (req, res, next) => {
		next(new APIError('Too many requests, please try again later.', httpStatus.TOO_MANY_REQUESTS));
	}
});

export default rateLimiter;
