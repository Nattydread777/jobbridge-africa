import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.js';
import { getAiMatches, optimizeCv } from '../controllers/aiController.js';

const router = express.Router();
const cvOptimizerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many CV optimization requests. Please try again later.' },
});

// GET /api/ai/match - Get recommended jobs for current user
router.get('/match', protect, getAiMatches);
router.post('/optimize-cv', cvOptimizerLimiter, optimizeCv);

export default router;
