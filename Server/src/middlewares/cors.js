import cors from 'cors';

/**
 * Comprehensive CORS middleware
 * Handles all CORS scenarios including preflight requests
 */
const corsOptions = {
	origin: (origin, callback) => {
		// Allow all origins - always return true
		callback(null, true);
	},
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'X-Requested-With',
		'Accept',
		'Origin',
		'Access-Control-Request-Method',
		'Access-Control-Request-Headers',
		'X-CSRF-Token'
	],
	exposedHeaders: ['Content-Type', 'Authorization', 'X-Total-Count'],
	optionsSuccessStatus: 200, // Some legacy browsers choke on 204
	preflightContinue: false,
	maxAge: 86400 // Cache preflight requests for 24 hours
};

export default cors(corsOptions);
