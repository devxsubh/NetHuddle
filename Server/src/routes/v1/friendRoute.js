import { Router } from 'express';
import authenticate from '~/middlewares/authenticate';
import catchAsync from '~/utils/catchAsync';
import friendController from '~/controllers/friendController';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Get user's friends
router.get('/', catchAsync(friendController.getFriends));

export default router;
