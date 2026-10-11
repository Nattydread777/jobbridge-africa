import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const cloudinaryCredentials = [
  process.env.CLOUDINARY_CLIENT_NAME,
  process.env.CLOUDINARY_CLIENT_API,
  process.env.CLOUDINARY_CLIENT_SECRET,
];

if (cloudinaryCredentials.every(Boolean)) {
  cloudinary.config({
    cloud_name: cloudinaryCredentials[0],
    api_key: cloudinaryCredentials[1],
    api_secret: cloudinaryCredentials[2],
  });
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('Cloudinary credentials are required in production.');
} else {
  console.warn(
    'Cloudinary is not configured; profile images and resume uploads will be unavailable.',
  );
}

export default cloudinary;
