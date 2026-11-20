import express from 'express';
import rateLimit from 'express-rate-limit';
import { optionalProtect, protect } from '../middleware/authMiddleware.js';
import { getAiMatches, optimizeCv } from '../controllers/aiController.js';
import { saveTailoredCv } from '../controllers/tailoredCvController.js';

const router = express.Router();
const cvOptimizerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many CV optimization requests. Please try again later.' },
});
const aiMatchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many matching requests. Please try again shortly.' },
});
const saveTailoredCvLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many saved CV versions. Please try again later.' },
});

// GET /api/ai/match - Get recommended jobs for current user
router.get('/match', aiMatchLimiter, protect, getAiMatches);
router.post('/optimize-cv', cvOptimizerLimiter, optionalProtect, optimizeCv);
router.post('/tailored-cvs', saveTailoredCvLimiter, protect, saveTailoredCv);

export default router;
