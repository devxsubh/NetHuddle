import APIError from '~/utils/apiError';
import tokenService from '~/services/tokenService';
import emailService from '~/services/emailService';
import User from '~/models/userModel';
import config from '~/config/config';
import httpStatus from 'http-status';
import Token from '~/models/tokenModel';
import Role from '~/models/roleModel';
import NetworkSession from '~/models/networkSessionModel';
import { getClientIpAddress, getNetworkSubnet } from '~/utils/networkUtils';

export const signup = async (req, res) => {
	const role = await Role.getRoleByName('User');
	req.body.roles = [role.id];
	const user = await User.createUser(req.body);
	const tokens = await tokenService.generateAuthTokens(user);

	// Register network session on signup
	const clientIp = getClientIpAddress(req);
	const networkSubnet = getNetworkSubnet(clientIp);
	const userAgent = req.headers['user-agent'];
	await NetworkSession.createOrUpdateSession(user.id, clientIp, networkSubnet, userAgent);

	// Convert to plain object and remove avatarUrl virtual field
	const userObj = user.toObject();
	delete userObj.avatarUrl;

	return res.json({
		success: true,
		data: { user: userObj, tokens }
	});
};

export const signin = async (req, res) => {
	const user = await User.getUserByUserName(req.body.userName);
	if (!user || !(await user.isPasswordMatch(req.body.password))) {
		throw new APIError('Incorrect user name or password', httpStatus.BAD_REQUEST);
	}
	const tokens = await tokenService.generateAuthTokens(user);

	// Register network session on login
	const clientIp = getClientIpAddress(req);
	const networkSubnet = getNetworkSubnet(clientIp);
	const userAgent = req.headers['user-agent'];
	await NetworkSession.createOrUpdateSession(user.id, clientIp, networkSubnet, userAgent);

	// Convert to plain object and remove avatarUrl virtual field
	const userObj = user.toObject();
	delete userObj.avatarUrl;

	return res.json({
		success: true,
		data: { user: userObj, tokens }
	});
};

export const current = async (req, res) => {
	const user = await User.getUserById(req.user.id);
	if (!user) {
		throw new APIError('User not found', httpStatus.NOT_FOUND);
	}
	return res.json({
		success: true,
		data: {
			firstName: user.firstName,
			lastName: user.lastName,
			userName: user.userName,
			avatar: user.avatar
		}
	});
};

export const getMe = async (req, res) => {
	const user = await User.getUserByIdWithRoles(req.user.id);
	if (!user) {
		throw new APIError('User not found', httpStatus.NOT_FOUND);
	}
	// Convert to plain object and remove avatarUrl virtual field
	const userObj = user.toObject();
	delete userObj.avatarUrl;
	return res.json({
		success: true,
		data: userObj
	});
};

export const updateMe = async (req, res) => {
	const user = await User.updateUserById(req.user.id, req.body);
	// Convert to plain object and remove avatarUrl virtual field
	const userObj = user.toObject();
	delete userObj.avatarUrl;
	return res.json({
		success: true,
		data: userObj
	});
};

export const signout = async (req, res) => {
	await Token.revokeToken(req.body.refreshToken, config.TOKEN_TYPES.REFRESH);
	
	// Deactivate network sessions on logout
	if (req.user?.id) {
		await NetworkSession.deactivateUserSessions(req.user.id);
	}

	return res.json({
		success: true,
		data: 'Signout success'
	});
};

export const refreshTokens = async (req, res) => {
	try {
		const refreshTokenDoc = await tokenService.verifyToken(req.body.refreshToken, config.TOKEN_TYPES.REFRESH);
		const user = await User.getUserById(refreshTokenDoc.user);
		if (!user) {
			throw new Error();
		}
		await refreshTokenDoc.remove();
		const tokens = await tokenService.generateAuthTokens(user);
		return res.json({
			success: true,
			data: {
				tokens
			}
		});
	} catch (err) {
		throw new APIError(err.message, httpStatus.UNAUTHORIZED);
	}
};

export const sendVerificationEmail = async (req, res) => {
	const user = await User.getUserByEmail(req.user.email);
	if (user.confirmed) {
		throw new APIError('Email already verified', httpStatus.BAD_REQUEST);
	}
	try {
		const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
		await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
		return res.json({
			success: true,
			data: 'Send verification email success'
		});
	} catch (error) {
		// If email service is not configured, provide a helpful error message
		if (error.message && error.message.includes('Email service is not configured')) {
			throw new APIError('Email service is not configured. Please contact the administrator.', httpStatus.SERVICE_UNAVAILABLE);
		}
		throw error;
	}
};

export const verifyEmail = async (req, res) => {
	try {
		const verifyEmailTokenDoc = await tokenService.verifyToken(req.query.token, config.TOKEN_TYPES.VERIFY_EMAIL);
		const user = await User.getUserById(verifyEmailTokenDoc.user);
		if (!user) {
			throw new Error();
		}
		await Token.deleteMany({ user: user.id, type: config.TOKEN_TYPES.VERIFY_EMAIL });
		await User.updateUserById(user.id, { confirmed: true });
		return res.json({
			success: true,
			data: 'Verify email success'
		});
	} catch (err) {
		throw new APIError('Email verification failed', httpStatus.UNAUTHORIZED);
	}
};

export const forgotPassword = async (req, res) => {
	const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
	await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
	return res.json({
		success: true,
		data: 'Send forgot password email success'
	});
};

export const resetPassword = async (req, res) => {
	try {
		const resetPasswordTokenDoc = await tokenService.verifyToken(req.query.token, config.TOKEN_TYPES.RESET_PASSWORD);
		const user = await User.getUserById(resetPasswordTokenDoc.user);
		if (!user) {
			throw new Error();
		}
		await Token.deleteMany({ user: user.id, type: config.TOKEN_TYPES.RESET_PASSWORD });
		await User.updateUserById(user.id, { password: req.body.password });
		return res.json({
			success: true,
			data: 'Reset password success'
		});
	} catch (err) {
		throw new APIError('Password reset failed', httpStatus.UNAUTHORIZED);
	}
};

export default {
	signup,
	signin,
	current,
	getMe,
	updateMe,
	signout,
	refreshTokens,
	sendVerificationEmail,
	verifyEmail,
	forgotPassword,
	resetPassword
};
