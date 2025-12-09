import mongoose from 'mongoose';
import toJSON from './plugins/toJSONPlugin';

const networkFileShareSchema = mongoose.Schema(
	{
		user: {
			type: mongoose.SchemaTypes.ObjectId,
			ref: 'users',
			required: true,
			index: true
		},
		networkSubnet: {
			type: String,
			required: true,
			index: true
		},
		transferId: {
			type: String,
			required: true,
			unique: true,
			index: true
		},
		fileName: {
			type: String,
			required: true
		},
		filePath: {
			type: String,
			required: true
		},
		fileSize: {
			type: Number,
			required: true
		},
		fileType: {
			type: String
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }
	}
);

networkFileShareSchema.plugin(toJSON);

// Compound index for efficient queries
networkFileShareSchema.index({ networkSubnet: 1, createdAt: -1 });

// TTL index to auto-delete files after 24 hours
networkFileShareSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

class NetworkFileShareClass {
	static async createFileShare(userId, networkSubnet, transferId, fileName, filePath, fileSize, fileType) {
		const fileShare = await this.create({
			user: userId,
			networkSubnet,
			transferId,
			fileName,
			filePath,
			fileSize,
			fileType
		});
		return fileShare;
	}

	static async getNetworkFiles(networkSubnet, excludeUserId = null) {
		const query = {
			networkSubnet
		};

		if (excludeUserId) {
			query.user = { $ne: excludeUserId };
		}

		return await this.find(query)
			.populate({
				path: 'user',
				select: 'firstName lastName userName avatar avatarUrl email'
			})
			.sort({ createdAt: -1 })
			.limit(100); // Limit to last 100 files
	}

	static async deleteFileShare(transferId) {
		return await this.deleteOne({ transferId });
	}
}

networkFileShareSchema.loadClass(NetworkFileShareClass);

const NetworkFileShare = mongoose.model('networkFileShares', networkFileShareSchema);

export default NetworkFileShare;

