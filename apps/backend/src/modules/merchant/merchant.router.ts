import { Router } from 'express';
import merchantController from './merchant.controller';
import { authenticateUser, authenticateApiKey } from '../../shared/middleware/auth';
import { publicApiRateLimiter, merchantApiRateLimiter } from '../../shared/middleware/rateLimiter';

const router = Router();

// --- AUTH ROUTES (Public with Rate Limiting) ---
router.post('/auth/register', publicApiRateLimiter, merchantController.register);
router.post('/auth/login', publicApiRateLimiter, merchantController.login);
router.post('/auth/refresh', publicApiRateLimiter, merchantController.refresh);
router.post('/auth/password-reset', publicApiRateLimiter, merchantController.passwordReset);

// --- MERCHANT PANEL ROUTES (JWT Authenticated) ---
router.post('/merchant/api-keys', authenticateUser, merchantController.generateApiKey);
router.get('/merchant/api-keys', authenticateUser, merchantController.listApiKeys);
router.delete('/merchant/api-keys/:id', authenticateUser, merchantController.revokeApiKey);

router.post('/merchant/webhooks', authenticateUser, merchantController.configureWebhook);
router.get('/merchant/webhooks', authenticateUser, merchantController.listWebhooks);

router.get('/merchant/balance', authenticateUser, merchantController.getBalance);
router.get('/merchant/payments', authenticateUser, merchantController.listPayments);
router.get('/merchant/refunds', authenticateUser, merchantController.listRefunds);
router.get('/merchant/settlements', authenticateUser, merchantController.listSettlements);

// --- API-KEY INTEGRATION ROUTES (For Merchant API Integration, Authenticated via API key header) ---
// These allow merchants to fetch balance, payments, etc., via API keys directly.
router.get('/v1/balance', authenticateApiKey, merchantApiRateLimiter, merchantController.getBalance);
router.get('/v1/payments', authenticateApiKey, merchantApiRateLimiter, merchantController.listPayments);
router.get('/v1/refunds', authenticateApiKey, merchantApiRateLimiter, merchantController.listRefunds);

export default router;
