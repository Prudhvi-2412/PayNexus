import { Router } from 'express';
import settlementController from './settlement.controller';
import { authenticateUser, requireRoles } from '../../shared/middleware/auth';

const router = Router();

// --- ADMIN SETTLEMENTS TRIGGER ROUTE ---
// Requires Super Admin JWT and Role verification
router.post(
  '/trigger',
  authenticateUser,
  requireRoles('SUPER_ADMIN'),
  settlementController.triggerSettlement
);

export default router;
