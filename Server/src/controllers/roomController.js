import httpStatus from 'http-status';
import Room from '~/models/roomModel';
import APIError from '~/utils/apiError';
import catchAsync from '~/utils/catchAsync';

/**
 * Create a new room
 */
export const createRoom = catchAsync(async (req, res) => {
	const { name, description, type, isPrivate, maxMembers, memberIds } = req.body;
	const userId = req.user._id || req.user.id;

	// Start with creator as owner
	const members = [
		{
			user: userId,
			role: 'owner',
			joinedAt: new Date(),
		},
	];

	// Add selected members if provided
	if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
		// Filter out the creator if they're in the list
		const uniqueMemberIds = [...new Set(memberIds.filter(id => id.toString() !== userId.toString()))];
		
		uniqueMemberIds.forEach((memberId) => {
			members.push({
				user: memberId,
				role: 'member',
				joinedAt: new Date(),
			});
		});
	}

	const roomData = {
		name,
		description,
		createdBy: userId,
		type: type || 'chat',
		isPrivate: isPrivate || false,
		maxMembers: maxMembers || Math.max(10, members.length),
		members,
	};

	const room = await Room.createRoom(roomData);

	return res.status(httpStatus.CREATED).json({
		success: true,
		data: room,
	});
});

/**
 * Get all active rooms
 */
export const getRooms = catchAsync(async (req, res) => {
	const { type, isPrivate } = req.query;
	const filters = {};

	if (type) {
		filters.type = type;
	}

	if (isPrivate !== undefined) {
		filters.isPrivate = isPrivate === 'true';
	}

	const rooms = await Room.getActiveRooms(filters);

	return res.json({
		success: true,
		data: rooms,
	});
});

/**
 * Get room by ID
 */
export const getRoom = catchAsync(async (req, res) => {
	const { roomId } = req.params;
	const room = await Room.getRoomById(roomId);

	if (!room) {
		throw new APIError('Room not found', httpStatus.NOT_FOUND);
	}

	if (!room.isActive) {
		throw new APIError('Room is not active', httpStatus.BAD_REQUEST);
	}

	return res.json({
		success: true,
		data: room,
	});
});

/**
 * Join a room
 */
export const joinRoom = catchAsync(async (req, res) => {
	const { roomId } = req.params;
	const userId = req.user._id || req.user.id;

	const room = await Room.getRoomById(roomId);

	if (!room) {
		throw new APIError('Room not found', httpStatus.NOT_FOUND);
	}

	if (!room.isActive) {
		throw new APIError('Room is not active', httpStatus.BAD_REQUEST);
	}

	if (room.isMember(userId)) {
		// User is already a member, return the room
		const updatedRoom = await Room.getRoomById(roomId);
		return res.json({
			success: true,
			data: updatedRoom,
			message: 'Already a member of this room',
		});
	}

	await room.addMember(userId);

	const updatedRoom = await Room.getRoomById(roomId);

	return res.json({
		success: true,
		data: updatedRoom,
		message: 'Successfully joined room',
	});
});

/**
 * Leave a room
 */
export const leaveRoom = catchAsync(async (req, res) => {
	const { roomId } = req.params;
	const userId = req.user._id || req.user.id;

	const room = await Room.getRoomById(roomId);

	if (!room) {
		throw new APIError('Room not found', httpStatus.NOT_FOUND);
	}

	if (!room.isMember(userId)) {
		throw new APIError('You are not a member of this room', httpStatus.BAD_REQUEST);
	}

	// Check if user is the owner
	const member = room.members.find((m) => m.user._id.toString() === userId.toString());
	if (member && member.role === 'owner') {
		// If owner leaves, deactivate room
		room.isActive = false;
		await room.save();
	} else {
		await room.removeMember(userId);
	}

	return res.json({
		success: true,
		message: 'Successfully left room',
	});
});

/**
 * Update room
 */
export const updateRoom = catchAsync(async (req, res) => {
	const { roomId } = req.params;
	const userId = req.user._id || req.user.id;
	const updates = req.body;

	const room = await Room.getRoomById(roomId);

	if (!room) {
		throw new APIError('Room not found', httpStatus.NOT_FOUND);
	}

	// Check if user is owner or admin
	const member = room.members.find((m) => m.user._id.toString() === userId.toString());
	if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
		throw new APIError('You do not have permission to update this room', httpStatus.FORBIDDEN);
	}

	Object.assign(room, updates);
	await room.save();

	const updatedRoom = await Room.getRoomById(roomId);

	return res.json({
		success: true,
		data: updatedRoom,
	});
});

/**
 * Delete room
 */
export const deleteRoom = catchAsync(async (req, res) => {
	const { roomId } = req.params;
	const userId = req.user._id || req.user.id;

	const room = await Room.getRoomById(roomId);

	if (!room) {
		throw new APIError('Room not found', httpStatus.NOT_FOUND);
	}

	// Check if user is owner
	const member = room.members.find((m) => m.user._id.toString() === userId.toString());
	if (!member || member.role !== 'owner') {
		throw new APIError('Only the room owner can delete the room', httpStatus.FORBIDDEN);
	}

	room.isActive = false;
	await room.save();

	return res.json({
		success: true,
		message: 'Room deleted successfully',
	});
});

/**
 * Get room messages
 */
export const getRoomMessages = catchAsync(async (req, res) => {
	const { roomId } = req.params;
	const userId = req.user._id || req.user.id;
	const { limit = 50, skip = 0 } = req.query;

	const RoomMessage = (await import('~/models/roomMessageModel')).default;

	const room = await Room.getRoomById(roomId);

	if (!room) {
		throw new APIError('Room not found', httpStatus.NOT_FOUND);
	}

	if (!room.isActive) {
		throw new APIError('Room is not active', httpStatus.BAD_REQUEST);
	}

	// Check if user is a member
	if (!room.isMember(userId)) {
		throw new APIError('You are not a member of this room', httpStatus.FORBIDDEN);
	}

	const messages = await RoomMessage.getRoomMessages(
		roomId,
		parseInt(limit),
		parseInt(skip)
	);

	// Format messages for response
	const formattedMessages = messages.reverse().map((msg) => ({
		id: msg._id.toString(),
		roomId: msg.room.toString(),
		from: {
			userId: msg.sender._id.toString(),
			userName: msg.sender.userName,
			firstName: msg.sender.firstName,
			lastName: msg.sender.lastName,
			avatar: msg.sender.avatar,
			avatarUrl: msg.sender.avatar ? 
				`${process.env.BASE_URL || 'http://localhost:5000'}/images/${msg.sender.avatar}` : 
				null
		},
		message: msg.message,
		type: msg.type,
		timestamp: msg.createdAt
	}));

	return res.json({
		success: true,
		data: formattedMessages,
		count: formattedMessages.length
	});
});

export default {
	createRoom,
	getRooms,
	getRoom,
	joinRoom,
	leaveRoom,
	updateRoom,
	deleteRoom,
	getRoomMessages,
};

