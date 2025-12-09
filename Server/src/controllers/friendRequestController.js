import httpStatus from 'http-status';
import Friend from '~/models/friendModel';
import APIError from '~/utils/apiError';
import catchAsync from '~/utils/catchAsync';
import { emitToUser } from '~/services/socketService';

/**
 * Send friend request
 */
export const sendFriendRequest = catchAsync(async (req, res) => {
	const { receiver } = req.body;
	const senderId = req.user._id || req.user.id;

	if (!receiver) {
		throw new APIError('Receiver ID is required', httpStatus.BAD_REQUEST);
	}

	if (senderId.toString() === receiver.toString()) {
		throw new APIError('Cannot send friend request to yourself', httpStatus.BAD_REQUEST);
	}

	// Check if friendship already exists
	const existingFriendship = await Friend.findOne({
		$or: [
			{ user: senderId, friend: receiver },
			{ user: receiver, friend: senderId }
		]
	});

	if (existingFriendship) {
		if (existingFriendship.status === 'accepted') {
			throw new APIError('You are already friends', httpStatus.BAD_REQUEST);
		}
		if (existingFriendship.status === 'pending') {
			throw new APIError('Friend request already sent', httpStatus.BAD_REQUEST);
		}
		// If rejected, update to pending
		existingFriendship.status = 'pending';
		existingFriendship.user = senderId;
		existingFriendship.friend = receiver;
		await existingFriendship.save();

		// Populate sender info for notification
		const populatedRequest = await Friend.findById(existingFriendship.id)
			.populate('user', 'userName firstName lastName avatar avatarUrl')
			.populate('friend', 'userName firstName lastName avatar avatarUrl');

		// Emit real-time notification to receiver
		emitToUser(receiver.toString(), 'friend:request:received', {
			request: {
				id: existingFriendship.id,
				sender: {
					id: req.user._id || req.user.id,
					userName: req.user.userName,
					firstName: req.user.firstName,
					lastName: req.user.lastName,
					avatar: req.user.avatar,
					avatarUrl: req.user.avatarUrl
				},
				status: 'pending',
				createdAt: existingFriendship.createdAt || new Date()
			}
		});

		return res.json({
			success: true,
			data: populatedRequest
		});
	}

	// Create new friend request
	const friendRequest = await Friend.create({
		user: senderId,
		friend: receiver,
		status: 'pending'
	});

	// Populate sender info for notification
	const populatedRequest = await Friend.findById(friendRequest.id)
		.populate('user', 'userName firstName lastName avatar avatarUrl')
		.populate('friend', 'userName firstName lastName avatar avatarUrl');

	// Emit real-time notification to receiver
	emitToUser(receiver.toString(), 'friend:request:received', {
		request: {
			id: friendRequest.id,
			sender: {
				id: req.user._id || req.user.id,
				userName: req.user.userName,
				firstName: req.user.firstName,
				lastName: req.user.lastName,
				avatar: req.user.avatar,
				avatarUrl: req.user.avatarUrl
			},
			status: 'pending',
			createdAt: friendRequest.createdAt
		}
	});

	return res.status(httpStatus.CREATED).json({
		success: true,
		data: populatedRequest
	});
});

/**
 * Get user's friend requests (both sent and received)
 */
export const getUserFriendRequests = catchAsync(async (req, res) => {
	const userId = req.user._id || req.user.id;

	const friendRequests = await Friend.find({
		$or: [
			{ user: userId, status: 'pending' },
			{ friend: userId, status: 'pending' }
		]
	})
		.populate('user', 'userName firstName lastName avatar avatarUrl')
		.populate('friend', 'userName firstName lastName avatar avatarUrl')
		.sort({ createdAt: -1 });

	// Transform to match frontend expectations
	const transformedRequests = friendRequests.map((request) => {
		const isSent = request.user._id.toString() === userId.toString();
		return {
			id: request.id,
			sender: isSent ? request.user : request.friend,
			receiver: isSent ? request.friend : request.user,
			status: request.status,
			createdAt: request.createdAt,
			updatedAt: request.updatedAt
		};
	});

	return res.json({
		success: true,
		data: transformedRequests
	});
});

/**
 * Handle friend request (accept or reject)
 */
export const handleFriendRequest = catchAsync(async (req, res) => {
	const { requestId } = req.params;
	const { action } = req.body;
	const userId = req.user._id || req.user.id;

	if (!action || !['accept', 'reject'].includes(action)) {
		throw new APIError('Action must be either "accept" or "reject"', httpStatus.BAD_REQUEST);
	}

	const friendRequest = await Friend.findById(requestId);

	if (!friendRequest) {
		throw new APIError('Friend request not found', httpStatus.NOT_FOUND);
	}

	// Check if the current user is the receiver
	if (friendRequest.friend.toString() !== userId.toString()) {
		throw new APIError('You can only accept/reject friend requests sent to you', httpStatus.FORBIDDEN);
	}

	if (friendRequest.status !== 'pending') {
		throw new APIError('Friend request has already been handled', httpStatus.BAD_REQUEST);
	}

	if (action === 'accept') {
		friendRequest.status = 'accepted';
		await friendRequest.save();

		// Populate friend info
		const populatedRequest = await Friend.findById(friendRequest.id)
			.populate('user', 'userName firstName lastName avatar avatarUrl')
			.populate('friend', 'userName firstName lastName avatar avatarUrl');

		const senderId = friendRequest.user.toString();
		const receiverId = friendRequest.friend.toString();

		// Get friend info (the other user)
		const friendInfo = senderId === userId.toString() 
			? populatedRequest.friend 
			: populatedRequest.user;

		// Notify sender that their request was accepted
		emitToUser(senderId, 'friend:request:accepted', {
			request: {
				id: friendRequest.id,
				status: 'accepted',
				friend: {
					id: friendInfo._id || friendInfo.id,
					userName: friendInfo.userName,
					firstName: friendInfo.firstName,
					lastName: friendInfo.lastName,
					avatar: friendInfo.avatar,
					avatarUrl: friendInfo.avatarUrl
				}
			}
		});

		// Notify receiver (accepter) that they now have a new friend
		emitToUser(receiverId, 'friend:added', {
			friend: {
				id: friendInfo._id || friendInfo.id,
				userName: friendInfo.userName,
				firstName: friendInfo.firstName,
				lastName: friendInfo.lastName,
				avatar: friendInfo.avatar,
				avatarUrl: friendInfo.avatarUrl
			}
		});
	} else {
		friendRequest.status = 'rejected';
		await friendRequest.save();

		// Notify sender that their request was rejected
		const senderId = friendRequest.user.toString();
		emitToUser(senderId, 'friend:request:rejected', {
			request: {
				id: friendRequest.id,
				status: 'rejected'
			}
		});
	}

	return res.json({
		success: true,
		data: { id: friendRequest.id, status: friendRequest.status }
	});
});

export default {
	sendFriendRequest,
	getUserFriendRequests,
	handleFriendRequest
};

