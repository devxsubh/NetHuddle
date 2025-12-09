import { Router } from 'express';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import catchAsync from '~/utils/catchAsync';
import friendRequestController from '~/controllers/friendRequestController';
import friendRequestValidation from '~/validations/friendRequestValidation';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Send friend request
router.post(
	'/',
	validate(friendRequestValidation.sendFriendRequest),
	catchAsync(friendRequestController.sendFriendRequest)
);

// Get user's friend requests
router.get('/', catchAsync(friendRequestController.getUserFriendRequests));

// Handle friend request (accept/reject)
router.delete(
	'/:requestId',
	validate(friendRequestValidation.handleFriendRequest),
	catchAsync(friendRequestController.handleFriendRequest)
);

export default router;

