import mongoose from 'mongoose';

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error(
      'MONGO_URI is required. Configure a live MongoDB connection in backend/.env.',
    );
  }
  if (!process.env.MONGO_URI.startsWith('mongodb://')) {
    throw new Error(
      'MONGO_URI must use the standard mongodb:// seed-list format. Get the direct connection string from MongoDB Atlas > Connect > Drivers.',
    );
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Fail quickly if Atlas cannot be reached instead of blocking API startup.
      serverSelectionTimeoutMS: 5000,
      // Bound stalled database sockets while allowing longer-running queries.
      socketTimeoutMS: 45000,
    });
    console.log(
      `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`,
    );
    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
};

export default connectDB;
