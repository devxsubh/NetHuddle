import httpStatus from 'http-status';
import { getTransferStatus, getUserTransfers } from '~/services/tcpServer';
import NetworkFileShare from '~/models/networkFileShareModel';
import { getClientIpAddress, getNetworkSubnet } from '~/utils/networkUtils';
import APIError from '~/utils/apiError';
import catchAsync from '~/utils/catchAsync';

/**
 * Get transfer status
 */
export const getTransfer = catchAsync(async (req, res) => {
	const { transferId } = req.params;

	const transfer = getTransferStatus(transferId);

	if (!transfer) {
		throw new APIError('Transfer not found', httpStatus.NOT_FOUND);
	}

	// Check if user has access to this transfer
	const userId = req.user._id || req.user.id;
	if (transfer.userId.toString() !== userId.toString()) {
		throw new APIError('Access denied', httpStatus.FORBIDDEN);
	}

	return res.json({
		success: true,
		data: transfer,
	});
});

/**
 * Get all active transfers for current user
 */
export const getMyTransfers = catchAsync(async (req, res) => {
	const userId = req.user._id || req.user.id;

	const transfers = getUserTransfers(userId);

	return res.json({
		success: true,
		data: transfers,
	});
});

/**
 * Get all files shared in the network
 */
export const getNetworkFiles = catchAsync(async (req, res) => {
	const clientIp = getClientIpAddress(req);
	const networkSubnet = getNetworkSubnet(clientIp);
	
	// Validate req.user exists
	if (!req.user) {
		throw new APIError('User not authenticated', httpStatus.UNAUTHORIZED);
	}
	
	const currentUserId = req.user._id || req.user.id;
	
	if (!currentUserId) {
		throw new APIError('Invalid user ID', httpStatus.BAD_REQUEST);
	}

	// Get all files shared in the network
	const files = await NetworkFileShare.getNetworkFiles(networkSubnet, currentUserId);

	// Transform the data
	const networkFiles = files.map((fileShare) => {
		const fileUser = fileShare.user;
		return {
			transferId: fileShare.transferId,
			fileName: fileShare.fileName,
			filePath: fileShare.filePath,
			fileSize: fileShare.fileSize,
			fileType: fileShare.fileType,
			uploadedBy: {
				userId: fileUser._id || fileUser.id,
				firstName: fileUser.firstName,
				lastName: fileUser.lastName,
				userName: fileUser.userName,
				avatar: fileUser.avatar,
				avatarUrl: fileUser.avatarUrl
			},
			uploadedAt: fileShare.createdAt
		};
	});

	return res.json({
		success: true,
		data: {
			files: networkFiles,
			networkInfo: {
				networkSubnet,
				yourIpAddress: clientIp,
				totalFiles: networkFiles.length
			}
		}
	});
});

export default {
	getTransfer,
	getMyTransfers,
	getNetworkFiles,
};

