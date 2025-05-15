const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../data/dbConfig');

const JWT_SECRET = process.env.JWT_SECRET || 'shh';

function buildToken(user) {
  const payload = {
    subject: user.id,
    username: user.username
  };
  const options = {
    expiresIn: '1d',
  };
  return jwt.sign(payload, JWT_SECRET, options);
}

// REGISTER
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password required' });
  }

  try {
    const existingUser = await db('users').where({ username }).first();

    if (existingUser) {
      return res.status(400).json({ message: 'username taken' });
    }

    const hash = bcrypt.hashSync(password, 8); // 2^8 rounds
    const [id] = await db('users').insert({ username, password: hash });
    const newUser = await db('users').where('id', id).first();

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: 'Error registering user', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password required' });
  }

  try {
    const user = await db('users').where({ username }).first();

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const token = buildToken(user);
    res.status(200).json({
      message: `welcome, ${user.username}`,
      token,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error logging in', error: err.message });
  }
});

module.exports = router;
