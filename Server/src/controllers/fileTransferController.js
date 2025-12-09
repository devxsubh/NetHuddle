import httpStatus from 'http-status';
import { getTransferStatus, getUserTransfers } from '~/services/tcpServer';
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

export default {
	getTransfer,
	getMyTransfers,
};

