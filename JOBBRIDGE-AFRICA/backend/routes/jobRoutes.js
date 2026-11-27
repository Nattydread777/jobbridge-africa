// backend/routes/jobRoutes.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { optionalProtect, protect, employer } from '../middleware/authMiddleware.js';
import { 
    getJobs, 
    getEmployerJobs,
    getJobById, 
    createJob, 
    updateJob, 
    deleteJob,
    reportJob,
    trackOutboundClick,
} from '../controllers/jobController.js';

const router = express.Router();
const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many job reports. Please try again later.' },
});
const outboundClickLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many outbound clicks. Please try again later.' },
});

// Public routes
router.route('/').get(getJobs);
router.get('/my-postings', protect, employer, getEmployerJobs);
router.post('/:id/report', reportLimiter, reportJob);
router.post('/:id/outbound-click', outboundClickLimiter, optionalProtect, trackOutboundClick);
router.route('/:id').get(getJobById);

// Employer protected routes
router.route('/').post(protect, employer, createJob);
router.route('/:id')
    .put(protect, employer, updateJob)
    .delete(protect, employer, deleteJob);

export default router;