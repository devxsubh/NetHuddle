import { Router } from 'express';
import catchAsync from '~/utils/catchAsync';
import authenticate from '~/middlewares/authenticate';
import fileTransferController from '~/controllers/fileTransferController';

const router = Router();

// All routes require authentication
router.use(authenticate());

// Get all files shared in the network (must be before /:transferId to avoid route conflict)
router.get('/network', catchAsync(fileTransferController.getNetworkFiles));

// Get all my transfers
router.get('/', catchAsync(fileTransferController.getMyTransfers));

// Get transfer status (must be last to avoid matching /network as transferId)
router.get('/:transferId', catchAsync(fileTransferController.getTransfer));

export default router;

