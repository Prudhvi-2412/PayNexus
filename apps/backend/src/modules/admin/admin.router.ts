import { Router } from 'express';
import adminController from './admin.controller';
import { authenticateUser, requireRoles } from '../../shared/middleware/auth';

const router = Router();

// --- ADMIN ANALYTICS ---
router.get(
  '/analytics',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  adminController.getAnalytics
);

export default router;
