import { Router } from 'express';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import catchAsync from '~/utils/catchAsync';
import quicController from '~/controllers/quicController';
import quicValidation from '~/validations/quicValidation';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Get QUIC server connection info
router.get('/info', catchAsync(quicController.getQuicServerInfo));

// Create streaming session
router.post('/session', validate(quicValidation.createStreamingSession), catchAsync(quicController.createStreamingSession));

// Health check
router.get('/health', catchAsync(quicController.checkQuicHealth));

export default router;

