// Write your tests here
test('sanity', () => {
  expect(true).toBe(true);
});

process.env.NODE_ENV = 'testing';

const request = require('supertest');
const db = require('../data/dbConfig');
const server = require('./server'); // assumes this file loads express and uses routers

beforeEach(async () => {
  await db('users').truncate();
});

afterAll(async () => {
  await db.destroy(); // cleanly close db connection after tests
});

describe('Auth Endpoints', () => {
  describe('[POST] /api/auth/register', () => {
    it('registers a new user and returns the user object', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'pass123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('username', 'testuser');
      expect(res.body).toHaveProperty('password');
      expect(typeof res.body.password).toBe('string');
      expect(res.body.password).not.toBe('pass123'); // should be hashed
    });

    it('returns error when username or password is missing', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ username: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('username and password required');
    });

    it('returns error when username is already taken', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'pass' });

      const res = await request(server)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'pass' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('username taken');
    });
  });

  describe('[POST] /api/auth/login', () => {
    beforeEach(async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ username: 'tester', password: '1234' });
    });

    it('logs in a user and returns a token', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ username: 'tester', password: '1234' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'welcome, tester');
      expect(res.body).toHaveProperty('token');
    });

    it('returns a properly formatted JWT on login', async () => {
      const login = await request(server)
        .post('/api/auth/login')
        .send({ username: 'tester', password: '1234' });

      const token = login.body.token;
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT = header.payload.signature
    });

    it('returns error for missing username or password', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ username: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('username and password required');
    });

    it('returns error for invalid credentials', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ username: 'tester', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('invalid credentials');
    });
  });

  describe('[GET] /api/jokes', () => {
    it('returns 401 if no token is provided', async () => {
      const res = await request(server).get('/api/jokes');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('token required'); // ensure lowercase "token required"
    });

    it('returns 401 if token is invalid', async () => {
      const res = await request(server)
        .get('/api/jokes')
        .set('Authorization', 'invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('token invalid'); // ensure lowercase "token invalid"
    });

    it('returns jokes if a valid token is provided', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ username: 'jokester', password: 'haha123' });

      const login = await request(server)
        .post('/api/auth/login')
        .send({ username: 'jokester', password: 'haha123' });

      const token = login.body.token;

      const res = await request(server)
        .get('/api/jokes')
        .set('Authorization', token);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('joke');
    });
  });
});
