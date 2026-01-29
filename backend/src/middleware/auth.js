const crypto = require('crypto');
const { getModels, Op } = require('../db');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { Session, User } = getModels();
  const now = Math.floor(Date.now() / 1000);

  const result = await Session.findOne({
    where: {
      token,
      expires_at: { [Op.gt]: now }
    },
    include: [{ model: User, attributes: ['id', 'username', 'is_admin'] }]
  }).catch(() => null);

  if (!result) return res.status(401).json({ error: 'Session expired' });

  req.user = { id: result.User.id, username: result.User.username, isAdmin: !!result.User.is_admin };
  req.token = token;
  next();
}

async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { Session, User } = getModels();
    const now = Math.floor(Date.now() / 1000);

    const result = await Session.findOne({
      where: {
        token,
        expires_at: { [Op.gt]: now }
      },
      include: [{ model: User, attributes: ['id', 'username', 'is_admin'] }]
    }).catch(() => null);

    if (result) {
      req.user = { id: result.User.id, username: result.User.username, isAdmin: !!result.User.is_admin };
    }
  }
  next();
}

module.exports = {
  generateToken,
  authMiddleware,
  optionalAuthMiddleware
};
