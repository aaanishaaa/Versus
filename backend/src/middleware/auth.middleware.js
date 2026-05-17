import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'versus-dev-secret');
    req.user = {
      id: payload.sub,
      email: payload.email,
    };
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export default authMiddleware;
