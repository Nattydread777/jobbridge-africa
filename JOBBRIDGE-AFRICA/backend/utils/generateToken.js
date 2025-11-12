import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRE || !process.env.COOKIE_EXPIRE) {
    throw new Error('Missing JWT configuration in environment variables');
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
  });
};

export default generateToken;
