import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import fileTransferController from '~/controllers/fileTransferController';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Get transfer status
router.get('/:transferId', catchAsync(fileTransferController.getTransfer));

// Get all my transfers
router.get('/', catchAsync(fileTransferController.getMyTransfers));

export default router;

