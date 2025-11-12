import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.CLOUDINARY_CLIENT_NAME || !process.env.CLOUDINARY_CLIENT_API || !process.env.CLOUDINARY_CLIENT_SECRET) {
  throw new Error('Cloudinary environment variables are missing.');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLIENT_NAME,
  api_key: process.env.CLOUDINARY_CLIENT_API,
  api_secret: process.env.CLOUDINARY_CLIENT_SECRET,
});

export default cloudinary;
