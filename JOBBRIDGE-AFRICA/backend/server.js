// backend/server.js (Use the 'import' syntax for all dependencies)

import 'dotenv/config'; // Loads environment variables immediately
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Internal modules
import connectDB from './config/db.js'; // MUST include .js extension
import authRoutes from './routes/authRoutes.js'; // Assuming this route exists
import jobRoutes from './routes/jobRoutes.js'; // Assuming this route exists
import applicationRoutes from './routes/applicationRoutes.js'; // Application routes
import aiRoutes from './routes/aiRoutes.js'; // AI routes
import { notFound, errorHandler } from './middleware/errorMiddleware.js'; // MUST include .js extension

// Connect to the database
connectDB(); 

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-frontend-domain.com' // Replace with your actual frontend domain
    : ['http://localhost:5173', 'http://localhost:5174'], // Allow requests from your Vite frontend
  credentials: true,
}));
app.use(express.json()); // Allows parsing of raw JSON data
app.use(express.urlencoded({ extended: true })); // Allows parsing of form data
app.use(cookieParser()); // Enables reading cookies

// -------------------
// API Routes
// -------------------
app.use('/api/auth', authRoutes); // Assuming you export routes as default from authRoutes.js
app.use('/api/jobs', jobRoutes); // Assuming you export routes as default from jobRoutes.js
app.use('/api/applications', applicationRoutes); // Application submission and management
app.use('/api/ai', aiRoutes); // AI matching

// Placeholder for root URL
app.get('/', (req, res) => {
  res.send('API Running for JobBridge Africa...');
});

// Error Handling Middleware (must be last)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));