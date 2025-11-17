// backend/routes/authRoutes.js
import express from 'express';
import multer from 'multer';
import { 
    registerUser, 
    loginUser, 
    logoutUser,
    getUserProfile,
    updateUserProfile,
  uploadProfileImage,
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

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
// One-time bootstrap (no auth): requires ADMIN_SETUP_TOKEN and no existing admin
router.post('/bootstrap-admin', bootstrapAdmin);

// Private/Protected Routes
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile); // Uses the 'protect' middleware to ensure a user is logged in
router.put('/profile', protect, updateUserProfile); // Update user profile
router.post('/upload-profile-image', protect, upload.single('profileImage'), uploadProfileImage); // Upload profile image

export default router;