import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const friendSchema = mongoose.Schema(
	{
		user: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true,
			index: true
		},
		friend: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true,
			index: true
		},
		status: {
			type: String,
			enum: ['pending', 'accepted', 'rejected'],
			default: 'pending'
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

// Compound index to ensure unique friendship pairs
friendSchema.index({ user: 1, friend: 1 }, { unique: true });

friendSchema.plugin(toJSON);

class FriendClass {
	/**
	 * Check if two users are friends
	 */
	static async areFriends(userId1, userId2) {
		const friendship = await this.findOne({
			$or: [
				{ user: userId1, friend: userId2, status: 'accepted' },
				{ user: userId2, friend: userId1, status: 'accepted' }
			]
		});
		return !!friendship;
	}

	/**
	 * Get all friends of a user
	 */
	static async getUserFriends(userId) {
		const friendships = await this.find({
			$or: [
				{ user: userId, status: 'accepted' },
				{ friend: userId, status: 'accepted' }
			]
		})
			.populate('user', 'userName firstName lastName avatar avatarUrl')
			.populate('friend', 'userName firstName lastName avatar avatarUrl');

		return friendships.map((friendship) => {
			// Return the friend (the other user)
			if (friendship.user._id.toString() === userId.toString()) {
				return friendship.friend;
			}
			return friendship.user;
		});
	}

	/**
	 * Create or update friend request
	 */
	static async createOrUpdateFriendRequest(senderId, receiverId, status = 'pending') {
		// Check if request already exists
		const existing = await this.findOne({
			$or: [
				{ user: senderId, friend: receiverId },
				{ user: receiverId, friend: senderId }
			]
		});

		if (existing) {
			existing.status = status;
			await existing.save();
			return existing;
		}

		// Create new request
		return await this.create({
			user: senderId,
			friend: receiverId,
			status
		});
	}
}

friendSchema.loadClass(FriendClass);

const Friend = mongoose.model('Friend', friendSchema);

export default Friend;

