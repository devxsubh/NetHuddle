import Joi from 'joi';

export const createStreamingSession = {
	body: Joi.object().keys({
		streamId: Joi.string().optional().allow(''),
	}),
};

export default {
	createStreamingSession,
};

