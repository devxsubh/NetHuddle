import { Router } from 'express';
import authRoute from './authRoute';
import userRoute from './userRoute';
import roleRoute from './roleRoute';
import imageRoute from './imageRoute';
import networkRoute from './networkRoute';
import roomRoute from './roomRoute';
import fileTransferRoute from './fileTransferRoute';
import metricsRoute from './metricsRoute';
import requestRoute from './requestRoute';
import quicRoute from './quicRoute';

const router = Router();

router.use('/auth', authRoute);
router.use('/users', userRoute);
router.use('/roles', roleRoute);
router.use('/images', imageRoute);
router.use('/network', networkRoute);
router.use('/rooms', roomRoute);
router.use('/file-transfer', fileTransferRoute);
router.use('/metrics', metricsRoute);
router.use('/request', requestRoute);
router.use('/quic', quicRoute);

export default router;
