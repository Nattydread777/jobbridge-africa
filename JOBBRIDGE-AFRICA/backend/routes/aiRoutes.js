import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getAiMatches } from '../controllers/aiController.js';

const router = express.Router();

// GET /api/ai/match - Get recommended jobs for current user
router.get('/match', protect, getAiMatches);

export default router;
