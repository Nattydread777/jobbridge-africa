import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getJobDigestPreferences,
  subscribeToJobAlerts,
  unsubscribeFromJobDigests,
  updateJobDigestPreferences,
} from '../controllers/jobAlertController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const subscriptionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many subscription attempts. Please try again later.' },
});

router.post('/', subscriptionLimiter, subscribeToJobAlerts);
router.get('/preferences', protect, getJobDigestPreferences);
router.put('/preferences', protect, updateJobDigestPreferences);
router.post('/unsubscribe', subscriptionLimiter, unsubscribeFromJobDigests);

export default router;
