import express from 'express';
import rateLimit from 'express-rate-limit';
import { subscribeToJobAlerts } from '../controllers/jobAlertController.js';

const router = express.Router();
const subscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many subscription attempts. Please try again later.' },
});

router.post('/', subscriptionLimiter, subscribeToJobAlerts);

export default router;
