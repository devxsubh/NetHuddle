import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import networkController from '~/controllers/networkController';

const router = Router();

// Get all users in the same network
router.get(
	'/users',
	authenticate(), // Requires authentication but no specific permissions
	catchAsync(networkController.getNetworkUsers)
);

// Update network presence (heartbeat)
router.post('/presence', authenticate(), catchAsync(networkController.updateNetworkPresence));

// Get network statistics
router.get('/stats', authenticate(), catchAsync(networkController.getNetworkStats));

export default router;
