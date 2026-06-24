import { Router } from 'express';
import paymentController from './payment.controller';
import { authenticateApiKey } from '../../shared/middleware/auth';
import { idempotency } from '../../shared/middleware/idempotency';
import { merchantApiRateLimiter, publicApiRateLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

// --- MERCHANT INTEGRATION ROUTE (Orders Creation) ---
// Requires API Key, Idempotency Check, and Rate Limiting
router.post(
  '/orders',
  authenticateApiKey,
  idempotency,
  merchantApiRateLimiter,
  paymentController.createOrder
);

// --- CHECKOUT FLOW ROUTES (Simulating Gateway/Customer Actions) ---
router.post(
  '/payments/authorize',
  publicApiRateLimiter,
  paymentController.authorizePayment
);

router.post(
  '/payments/capture',
  publicApiRateLimiter,
  paymentController.capturePayment
);

router.get(
  '/payments/routing-stats',
  paymentController.getRoutingStats
);

router.get(
  '/payments/admin-stats',
  paymentController.getAdminStats
);

export default router;
