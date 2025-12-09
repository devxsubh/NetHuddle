import { Router } from 'express';
import metricsService from '~/services/metricsService';

const router = Router();

// Prometheus metrics endpoint
router.get('/', async (req, res) => {
	try {
		const metrics = await metricsService.getMetrics();
		res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
		res.send(metrics);
	} catch (error) {
		res.status(500).json({
			success: false,
			error: 'Failed to get metrics',
		});
	}
});

export default router;

