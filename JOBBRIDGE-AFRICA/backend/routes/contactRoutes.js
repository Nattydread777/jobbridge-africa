import express from 'express';
import { sendContactEmail, checkEmailHealth } from '../controllers/contactController.js';

const router = express.Router();

router.post('/', sendContactEmail);
router.get('/health', checkEmailHealth);

export default router;
