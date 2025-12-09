import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const networkSessionSchema = mongoose.Schema(
	{
		user: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true,
			index: true
		},
		ipAddress: {
			type: String,
			required: true,
			index: true
		},
		networkSubnet: {
			type: String,
			required: true,
			index: true
		},
		userAgent: {
			type: String
		},
		isActive: {
			type: Boolean,
			default: true,
			index: true
		},
		lastSeen: {
			type: Date,
			default: Date.now,
			index: true
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

networkSessionSchema.plugin(toJSON);

// Compound index for efficient queries
networkSessionSchema.index({ networkSubnet: 1, isActive: 1, lastSeen: -1 });

// TTL index to auto-delete inactive sessions after 1 hour
networkSessionSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 3600 });

class NetworkSessionClass {
	static async createOrUpdateSession(userId, ipAddress, networkSubnet, userAgent) {
		// Update existing active session or create new one
		const session = await this.findOneAndUpdate(
			{
				user: userId,
				ipAddress,
				isActive: true
			},
			{
				$set: {
					networkSubnet,
					userAgent,
					lastSeen: new Date(),
					isActive: true
				}
			},
			{
				upsert: true,
				new: true,
				setDefaultsOnInsert: true
			}
		);
		return session;
	}

	static async getActiveSessionsByNetwork(networkSubnet, excludeUserId = null) {
		const query = {
			networkSubnet,
			isActive: true,
			lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Active within last 15 minutes
		};

		if (excludeUserId) {
			query.user = { $ne: excludeUserId };
		}

		return await this.find(query)
			.populate({
				path: 'user',
				select: 'firstName lastName userName avatar avatarUrl email'
			})
			.sort({ lastSeen: -1 });
	}

	static async deactivateUserSessions(userId) {
		return await this.updateMany(
			{
				user: userId,
				isActive: true
			},
			{
				$set: {
					isActive: false
				}
			}
		);
	}

	static async updateLastSeen(userId, ipAddress) {
		return await this.updateOne(
			{
				user: userId,
				ipAddress,
				isActive: true
			},
			{
				$set: {
					lastSeen: new Date()
				}
			}
		);
	}
}

networkSessionSchema.loadClass(NetworkSessionClass);

const NetworkSession = mongoose.model('networkSessions', networkSessionSchema);

export default NetworkSession;

