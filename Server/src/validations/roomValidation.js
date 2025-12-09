import Joi from 'joi';
import { mongoId } from './customValidation';

const createRoom = {
	body: Joi.object().keys({
		name: Joi.string().required().trim().min(1).max(100),
		description: Joi.string().trim().max(500).optional(),
		type: Joi.string().valid('chat', 'video', 'streaming').optional(),
		isPrivate: Joi.boolean().optional(),
		maxMembers: Joi.number().integer().min(2).max(100).optional(),
	}),
};

const joinRoom = {
	params: Joi.object().keys({
		roomId: Joi.string().custom(mongoId).required(),
	}),
};

const getRoom = {
	params: Joi.object().keys({
		roomId: Joi.string().custom(mongoId).required(),
	}),
};

const updateRoom = {
	params: Joi.object().keys({
		roomId: Joi.string().custom(mongoId).required(),
	}),
	body: Joi.object()
		.keys({
			name: Joi.string().trim().min(1).max(100).optional(),
			description: Joi.string().trim().max(500).optional(),
			isPrivate: Joi.boolean().optional(),
			maxMembers: Joi.number().integer().min(2).max(100).optional(),
		})
		.min(1),
};

const deleteRoom = {
	params: Joi.object().keys({
		roomId: Joi.string().custom(mongoId).required(),
	}),
};

export default {
	createRoom,
	joinRoom,
	getRoom,
	updateRoom,
	deleteRoom,
};

