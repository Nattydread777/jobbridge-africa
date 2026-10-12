import express from 'express';
import { ingestEmployerWebhookJobs } from '../controllers/employerWebhookController.js';
import { authenticateEmployerWebhook } from '../middleware/employerWebhookAuth.js';

const router = express.Router();

router.post('/webhook/jobs', authenticateEmployerWebhook, ingestEmployerWebhookJobs);

export default router;
