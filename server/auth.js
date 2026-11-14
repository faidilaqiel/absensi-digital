const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sdn_pengampon_3_cirebon_secret_key_2024';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      assigned_class_id: user.assigned_class_id
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak disediakan.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Sesi kedaluwarsa atau token tidak valid. Silakan login kembali.' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak. Fitur ini hanya untuk peran: ${allowedRoles.join(', ')}.`
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  authenticateToken,
  authorizeRoles,
  JWT_SECRET
};

