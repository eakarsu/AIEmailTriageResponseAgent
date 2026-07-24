const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('replace-')) throw new Error('JWT_SECRET must contain at least 32 non-placeholder characters');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const generateToken = (user) => {
  const configuredExpiry = process.env.JWT_EXPIRES_IN;
  const expiresIn = configuredExpiry && /^\d+(?:ms|s|m|h|d|w|y)$/.test(configuredExpiry)
    ? configuredExpiry
    : '24h';
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id },
    JWT_SECRET,
    { expiresIn }
  );
};

module.exports = { authenticateToken, generateToken };
