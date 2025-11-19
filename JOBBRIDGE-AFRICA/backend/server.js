// backend/server.js (Use the 'import' syntax for all dependencies)

import 'dotenv/config'; // Loads environment variables immediately
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

// Internal modules
import connectDB from './config/db.js'; // MUST include .js extension
import authRoutes from './routes/authRoutes.js'; // Assuming this route exists
import jobRoutes from './routes/jobRoutes.js'; // Assuming this route exists
import applicationRoutes from './routes/applicationRoutes.js'; // Application routes
import aiRoutes from './routes/aiRoutes.js'; // AI routes
import contactRoutes from './routes/contactRoutes.js'; // Contact form routes
import teamRoutes from './routes/teamRoutes.js'; // Team member routes
import userAdminRoutes from './routes/userAdminRoutes.js'; // Admin user management
import { notFound, errorHandler } from './middleware/errorMiddleware.js'; // MUST include .js extension

// -------------------
// Environment Validation
// -------------------
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'COOKIE_EXPIRE',
  'CLOUDINARY_CLIENT_NAME',
  'CLOUDINARY_CLIENT_API',
  'CLOUDINARY_CLIENT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Connect to the database
connectDB(); 

const app = express();
const PORT = process.env.PORT || 4000;

// Trust Render/Proxy so secure cookies work correctly
app.set('trust proxy', 1);

// -------------------
// Security & Performance Middleware
// -------------------
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary images
}));

// Compression for faster responses
app.use(compression());

// HTTP request logging (only in dev mode)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
});

// Stricter rate limit for contact form
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 contact form submissions per hour
  message: 'Too many contact form submissions, please try again later.',
});

// -------------------
// CORS Configuration
// -------------------
// Parse allowed origins from environment variable
const allowedOrigins = (() => {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.ALLOWED_ORIGINS) {
      return process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    }
    return ['https://www.jobbridgeafrica.org'];
  }
  return ['http://localhost:5173', 'http://localhost:5174'];
})();

// Robust CORS configuration with dynamic origin checking
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, cURL, or mobile apps)
    if (!origin) return callback(null, true);
    
    // Allow requests from whitelisted origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Block requests from non-whitelisted origins
      callback(new Error(`CORS policy: Origin ${origin} not allowed`), false);
    }
  },
  // CRITICAL: Must be true to allow cookies/credentials cross-domain
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json()); // Allows parsing of raw JSON data
app.use(express.urlencoded({ extended: true })); // Allows parsing of form data
app.use(cookieParser()); // Enables reading cookies

// -------------------
// API Routes
// -------------------
app.use('/api/auth', authLimiter, authRoutes); // Assuming you export routes as default from authRoutes.js
app.use('/api/jobs', jobRoutes); // Assuming you export routes as default from jobRoutes.js
app.use('/api/applications', applicationRoutes); // Application submission and management
app.use('/api/ai', aiRoutes); // AI matching
app.use('/api/contact', contactLimiter, contactRoutes); // Contact form
app.use('/api/team', teamRoutes); // Team member management
app.use('/api/users', userAdminRoutes); // Admin user management

// -------------------
// Health Check Endpoints
// -------------------
// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'JobBridge Africa API is running',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));