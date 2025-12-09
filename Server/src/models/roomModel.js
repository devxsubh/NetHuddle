import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const roomSchema = mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		description: {
			type: String,
			trim: true
		},
		createdBy: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		members: [
			{
				user: {
					type: mongoose.SchemaTypes.ObjectId,
					ref: 'users'
				},
				joinedAt: {
					type: Date,
					default: Date.now
				},
				role: {
					type: String,
					enum: ['owner', 'admin', 'member'],
					default: 'member'
				}
			}
		],
		type: {
			type: String,
			enum: ['chat', 'video', 'streaming'],
			default: 'chat'
		},
		isPrivate: {
			type: Boolean,
			default: false
		},
		maxMembers: {
			type: Number,
			default: 10
		},
		isActive: {
			type: Boolean,
			default: true
		}
	},
	{
		timestamps: true
	}
);

// Add plugin that converts mongoose to json
roomSchema.plugin(toJSON);

/**
 * Create a new room
 */
roomSchema.statics.createRoom = async function (roomData) {
	const room = await this.create(roomData);
	// Populate the room data before returning
	const populatedRoom = await this.findById(room._id)
		.populate('createdBy', 'userName firstName lastName avatar')
		.populate('members.user', 'userName firstName lastName avatar');
	
	if (!populatedRoom) {
		throw new Error('Failed to create room');
	}
	
	return populatedRoom;
};

/**
 * Get room by ID
 */
roomSchema.statics.getRoomById = async function (roomId) {
	return this.findById(roomId)
		.populate('createdBy', 'userName firstName lastName avatar')
		.populate('members.user', 'userName firstName lastName avatar');
};

/**
 * Get all active rooms
 */
roomSchema.statics.getActiveRooms = async function (filters = {}) {
	return this.find({ isActive: true, ...filters })
		.populate('createdBy', 'userName firstName lastName avatar')
		.populate('members.user', 'userName firstName lastName avatar')
		.sort({ createdAt: -1 });
};

/**
 * Add member to room
 */
roomSchema.methods.addMember = async function (userId, role = 'member') {
	const existingMember = this.members.find((m) => m.user.toString() === userId.toString());
	if (existingMember) {
		return this;
	}

	if (this.members.length >= this.maxMembers) {
		throw new Error('Room is full');
	}

	this.members.push({
		user: userId,
		role,
		joinedAt: new Date()
	});

	await this.save();
	return this;
};

/**
 * Remove member from room
 */
roomSchema.methods.removeMember = async function (userId) {
	this.members = this.members.filter((m) => m.user.toString() !== userId.toString());
	await this.save();
	return this;
};

/**
 * Check if user is member of room
 */
roomSchema.methods.isMember = function (userId) {
	return this.members.some((m) => m.user.toString() === userId.toString());
};

/**
 * Get member count
 */
roomSchema.methods.getMemberCount = function () {
	return this.members.length;
};

const Room = mongoose.model('Room', roomSchema);

export default Room;
