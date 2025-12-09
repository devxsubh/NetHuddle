import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import passport from '~/config/passport';
import routes from '~/routes/v1';
import error from '~/middlewares/error';
import rateLimiter from '~/middlewares/rateLimiter';
import { metricsMiddleware } from '~/middlewares/metrics';
import config from '~/config/config';
import morgan from '~/config/morgan';
import corsMiddleware from '~/middlewares/cors';

const app = express();

if (config.NODE_ENV !== 'test') {
	app.use(morgan);
}

// CORS MUST be first to handle preflight requests
app.use(corsMiddleware);

app.use(
	helmet({
		// Configure helmet to work with CORS
		crossOriginResourcePolicy: { policy: 'cross-origin' },
		crossOriginEmbedderPolicy: false
	})
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(rateLimiter);
app.use(metricsMiddleware); // Add metrics middleware
app.use(passport.initialize());
app.use(express.static('public'));
app.use('/images', express.static('public/images')); // Serve images from public/images
app.use('/uploads', express.static('uploads')); // Serve uploaded files
app.use('/api/v1', routes);
app.use(error.converter);
app.use(error.notFound);
app.use(error.handler);

export default app;
