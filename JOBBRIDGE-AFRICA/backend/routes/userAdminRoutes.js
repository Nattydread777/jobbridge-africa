import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getAllUsers, updateUserRole } from '../controllers/userAdminController.js';

const router = express.Router();

router.get('/', protect, admin, getAllUsers);
router.put('/:id/role', protect, admin, updateUserRole);

export default router;
