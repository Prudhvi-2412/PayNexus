import express from 'express';
import cors from 'cors';
import merchantRouter from './modules/merchant/merchant.router';
import paymentRouter from './modules/payment/payment.router';
import refundRouter from './modules/refund/refund.router';
import settlementRouter from './modules/settlement/settlement.router';
import adminRouter from './modules/admin/admin.router';

const app = express();

// --- STANDARD MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// --- API ROUTES ---
app.use('/api/v1', merchantRouter);
app.use('/api/v1', paymentRouter);
app.use('/api/v1/refunds', refundRouter);
app.use('/api/v1/settlements', settlementRouter);
app.use('/api/v1/admin', adminRouter);

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the server',
  });
});

export default app;
