import httpStatus from 'http-status';
import Friend from '~/models/friendModel';
import catchAsync from '~/utils/catchAsync';

/**
 * Get user's friends
 */
export const getFriends = catchAsync(async (req, res) => {
	const userId = req.user._id || req.user.id;

	const friends = await Friend.getUserFriends(userId);

	return res.json({
		success: true,
		data: friends
	});
});

export default { getFriends };

