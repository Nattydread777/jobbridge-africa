// backend/routes/jobRoutes.js
import express from 'express';
import { protect, employer } from '../middleware/authMiddleware.js';
import { 
    getJobs, 
    getJobById, 
    createJob, 
    updateJob, 
    deleteJob 
} from '../controllers/jobController.js';

const router = express.Router();

// Public routes
router.route('/').get(getJobs);
router.route('/:id').get(getJobById);

// Employer protected routes
router.route('/').post(protect, employer, createJob);
router.route('/:id')
    .put(protect, employer, updateJob)
    .delete(protect, employer, deleteJob);

export default router;