import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendContactEmail, checkEmailHealth } from '../controllers/contactController.js';

const router = express.Router();
const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many contact form submissions. Please try again later.' },
});

router.post('/', contactFormLimiter, sendContactEmail);
router.get('/health', checkEmailHealth);

export default router;
