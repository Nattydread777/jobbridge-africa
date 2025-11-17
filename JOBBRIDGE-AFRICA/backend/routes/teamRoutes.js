import express from 'express';
import multer from 'multer';
import {
  getTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/teamController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Public routes
router.get('/', getTeamMembers);
router.get('/:id', getTeamMemberById);

// Admin routes
router.post('/', protect, admin, upload.single('photo'), createTeamMember);
router.put('/:id', protect, admin, upload.single('photo'), updateTeamMember);
router.delete('/:id', protect, admin, deleteTeamMember);

export default router;
