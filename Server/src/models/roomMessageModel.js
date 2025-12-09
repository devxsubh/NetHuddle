import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const roomMessageSchema = mongoose.Schema(
	{
		room: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'Room',
			required: true,
			index: true
		},
		sender: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true
		},
		message: {
			type: String,
			required: true,
			trim: true
		},
		type: {
			type: String,
			enum: ['text', 'image', 'file', 'audio'],
			default: 'text'
		}
	},
	{
		timestamps: true
	}
);

// Add plugin that converts mongoose to json
roomMessageSchema.plugin(toJSON);

// Index for efficient querying
roomMessageSchema.index({ room: 1, createdAt: -1 });

/**
 * Get messages for a room
 */
roomMessageSchema.statics.getRoomMessages = async function (roomId, limit = 50, skip = 0) {
	return this.find({ room: roomId })
		.populate('sender', 'userName firstName lastName avatar')
		.sort({ createdAt: -1 })
		.limit(limit)
		.skip(skip)
		.lean();
};

/**
 * Create a new room message
 */
roomMessageSchema.statics.createRoomMessage = async function (roomId, senderId, message, type = 'text') {
	return this.create({
		room: roomId,
		sender: senderId,
		message,
		type
	});
};

const RoomMessage = mongoose.model('RoomMessage', roomMessageSchema);

export default RoomMessage;

