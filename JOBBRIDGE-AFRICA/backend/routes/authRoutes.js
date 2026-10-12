// backend/routes/authRoutes.js
import express from 'express';
import multer from 'multer';
import { 
    registerUser, 
    loginUser, 
    forgotPassword,
    resetPassword,
    logoutUser,
    getUserProfile,
    updateUserProfile,
  uploadProfileImage,
    uploadResume,
    bootstrapAdmin
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for profile image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
    }
  },
});
const resumeUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Resume must be a PDF, DOC, DOCX, or TXT file.'));
  },
});

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
// One-time bootstrap (no auth): requires ADMIN_SETUP_TOKEN and no existing admin
router.post('/bootstrap-admin', bootstrapAdmin);

// Private/Protected Routes
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile); // Uses the 'protect' middleware to ensure a user is logged in
router.put('/profile', protect, updateUserProfile); // Update user profile
router.post('/upload-profile-image', protect, upload.single('profileImage'), uploadProfileImage); // Upload profile image
router.post('/upload-resume', protect, resumeUpload.single('resume'), uploadResume);

export default router;