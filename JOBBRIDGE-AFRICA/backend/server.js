// backend/server.js (Use the 'import' syntax for all dependencies)

import 'dotenv/config'; // Loads environment variables immediately
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';

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
import { scheduleDailyJobIngestion } from './services/jobIngestor.js';

// -------------------
// Environment Validation
// -------------------
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'COOKIE_EXPIRE',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Copy backend/.env.example to backend/.env and configure the listed values.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

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
  return [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];
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
app.use('/api/', limiter);
app.use(express.json({ limit: '1mb' })); // Allows parsing of raw JSON data
app.use(express.urlencoded({ extended: true })); // Allows parsing of form data
app.use(cookieParser()); // Enables reading cookies

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
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'OK' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'OK' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    message: 'Database is temporarily unavailable. Please retry shortly.',
    database: 'disconnected',
  });
};

// -------------------
// API Routes
// -------------------
app.use('/api/auth', requireDatabase, authLimiter, authRoutes);
app.use('/api/jobs', requireDatabase, jobRoutes);
app.use('/api/applications', requireDatabase, applicationRoutes);
app.use('/api/ai', requireDatabase, aiRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/team', requireDatabase, teamRoutes);
app.use('/api/users', requireDatabase, userAdminRoutes);

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  scheduleDailyJobIngestion();

  await new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      resolve();
    });
    server.once('error', reject);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});