import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import validate from '~/middlewares/validate';
import roomController from '~/controllers/roomController';
import roomValidation from '~/validations/roomValidation';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Create room
router.post('/', validate(roomValidation.createRoom), catchAsync(roomController.createRoom));

// Get all rooms
router.get('/', catchAsync(roomController.getRooms));

// Get room by ID
router.get('/:roomId', validate(roomValidation.getRoom), catchAsync(roomController.getRoom));

// Get room messages
router.get('/:roomId/messages', validate(roomValidation.getRoom), catchAsync(roomController.getRoomMessages));

// Join room
router.post('/:roomId/join', validate(roomValidation.joinRoom), catchAsync(roomController.joinRoom));

// Leave room
router.post('/:roomId/leave', validate(roomValidation.joinRoom), catchAsync(roomController.leaveRoom));

// Update room
router.put('/:roomId', validate(roomValidation.updateRoom), catchAsync(roomController.updateRoom));

// Delete room
router.delete('/:roomId', validate(roomValidation.deleteRoom), catchAsync(roomController.deleteRoom));

export default router;
