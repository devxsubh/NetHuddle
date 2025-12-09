import Joi from 'joi';
import { mongoId } from './customValidation';

const sendFriendRequest = {
	body: Joi.object().keys({
		receiver: Joi.string().custom(mongoId).required()
	})
};

const handleFriendRequest = {
	params: Joi.object().keys({
		requestId: Joi.string().custom(mongoId).required()
	}),
	body: Joi.object().keys({
		action: Joi.string().valid('accept', 'reject').required()
	})
};

export default {
	sendFriendRequest,
	handleFriendRequest
};

