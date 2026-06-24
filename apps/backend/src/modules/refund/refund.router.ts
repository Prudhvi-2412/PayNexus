import { Router } from 'express';
import refundController from './refund.controller';
import { authenticateApiKey } from '../../shared/middleware/auth';
import { idempotency } from '../../shared/middleware/idempotency';
import { merchantApiRateLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

// --- MERCHANT INTEGRATION ROUTE (Refunds Creation) ---
router.post(
  '/',
  authenticateApiKey,
  idempotency,
  merchantApiRateLimiter,
  refundController.initiateRefund
);

export default router;
