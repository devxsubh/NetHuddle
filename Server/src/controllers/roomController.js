import httpStatus from 'http-status';
import Room from '~/models/roomModel';
import APIError from '~/utils/apiError';
import catchAsync from '~/utils/catchAsync';

/**
 * Create a new room
 */
export const createRoom = catchAsync(async (req, res) => {
	const { name, description, type, isPrivate, maxMembers } = req.body;
	const userId = req.user._id || req.user.id;

	const roomData = {
		name,
		description,
		createdBy: userId,
		type: type || 'chat',
		isPrivate: isPrivate || false,
		maxMembers: maxMembers || 10,
		members: [
			{
				user: userId,
				role: 'owner',
				joinedAt: new Date(),
			},
		],
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
		return res.json({
			success: true,
			data: room,
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

export default {
	createRoom,
	getRooms,
	getRoom,
	joinRoom,
	leaveRoom,
	updateRoom,
	deleteRoom,
};

