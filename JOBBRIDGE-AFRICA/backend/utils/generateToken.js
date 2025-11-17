import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRE || !process.env.COOKIE_EXPIRE) {
    throw new Error('Missing JWT configuration in environment variables');
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = isProd ? 'none' : 'lax';

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProd, // required for SameSite=None
    sameSite, // allow cross-site cookies in production (Vercel + Render)
    maxAge: Number(process.env.COOKIE_EXPIRE) * 24 * 60 * 60 * 1000,
  });
};

export default generateToken;
