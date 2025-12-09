import nodemailer from 'nodemailer';
import logger from '~/config/logger';
import template from './template';
import config from '~/config/config';

// Check if SMTP configuration is provided
const isEmailConfigured =
	config.SMTP_HOST && config.SMTP_PORT && config.SMTP_USERNAME && config.SMTP_PASSWORD && config.EMAIL_FROM;

// Only create transport if email is configured
export const transport = isEmailConfigured
	? nodemailer.createTransport({
			host: config.SMTP_HOST,
			port: config.SMTP_PORT,
			secure: config.SMTP_PORT === 465, // Use secure for port 465, otherwise false
			auth: {
				user: config.SMTP_USERNAME,
				pass: config.SMTP_PASSWORD
			}
	  })
	: null;

// Only verify connection if transport is configured and not in test mode
if (config.NODE_ENV !== 'test' && transport) {
	transport
		.verify()
		.then(() => logger.info('Connected to email server'))
		.catch((error) => {
			logger.warn('Unable to connect to email server:', error.message);
		});
} else if (config.NODE_ENV !== 'test' && !isEmailConfigured) {
	logger.warn('Email service is not configured. SMTP settings are missing. Email functionality will be disabled.');
}

export const sendEmail = async (to, subject, html) => {
	if (!transport) {
		throw new Error(
			'Email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, and EMAIL_FROM in your environment variables.'
		);
	}
	const msg = { from: `${config.APP_NAME} <${config.EMAIL_FROM}>`, to, subject, html };
	await transport.sendMail(msg);
};

export const sendResetPasswordEmail = async (to, token) => {
	const subject = 'Reset password';
	const resetPasswordUrl = `${config.FRONTEND_URL}/reset-password?token=${token}`;
	const html = template.resetPassword(resetPasswordUrl, config.APP_NAME);
	await sendEmail(to, subject, html);
};

export const sendVerificationEmail = async (to, token) => {
	const subject = 'Email Verification';
	const verificationEmailUrl = `${config.FRONTEND_URL}/auth/verify-email?token=${token}`;
	const html = template.verifyEmail(verificationEmailUrl, config.APP_NAME);
	await sendEmail(to, subject, html);
};

export default { sendEmail, sendResetPasswordEmail, sendVerificationEmail };
