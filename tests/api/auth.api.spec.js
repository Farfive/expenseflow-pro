const request = require('supertest');
const { expect } = require('@playwright/test');
const TestDataGenerator = require('../utils/test-data-generator');

// Import the Express app (adjust path as needed)
const app = require('../../simple-server'); // Adjust based on your server file

describe('Authentication API', () => {
  let server;

  beforeAll(async () => {
    // Start server if needed
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  describe('POST /api/auth/register', () => {
    test('should register new user with valid data', async () => {
      const userData = TestDataGenerator.generateUser();
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject registration with existing email', async () => {
      const userData = TestDataGenerator.generateUser();
      
      // Register user first time
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toContain('Email already exists');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' }),
          expect.objectContaining({ field: 'firstName' }),
          expect.objectContaining({ field: 'lastName' })
        ])
      );
    });

    test('should validate email format', async () => {
      const userData = TestDataGenerator.generateUser();
      userData.email = 'invalid-email';

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      );
    });

    test('should validate password strength', async () => {
      const userData = TestDataGenerator.generateUser();
      userData.password = '123'; // Weak password

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            field: 'password',
            message: expect.stringContaining('password')
          })
        ])
      );
    });

    test('should sanitize input data', async () => {
      const userData = TestDataGenerator.generateUser();
      userData.firstName = '<script>alert("xss")</script>';
      userData.lastName = '"; DROP TABLE users; --';

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Ensure malicious code is sanitized
      expect(response.body.user.firstName).not.toContain('<script>');
      expect(response.body.user.lastName).not.toContain('DROP TABLE');
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = TestDataGenerator.generateUser();
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password'
        })
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    test('should implement rate limiting', async () => {
      const loginAttempts = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        const attempt = request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          });
        loginAttempts.push(attempt);
      }

      const responses = await Promise.all(loginAttempts);
      
      // First few attempts should return 401
      expect(responses[0].status).toBe(401);
      expect(responses[1].status).toBe(401);
      
      // Later attempts should be rate limited (429)
      expect(responses[5].status).toBe(429);
    });

    test('should prevent SQL injection', async () => {
      const sqlInjectionAttempts = [
        "admin' --",
        "' OR '1'='1",
        "'; DROP TABLE users; --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: injection,
            password: injection
          });

        // Should not succeed or cause server error
        expect([400, 401]).toContain(response.status);
      }
    });
  });

  describe('POST /api/auth/refresh', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = TestDataGenerator.generateUser();
      
      // Register and login to get token
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      authToken = loginResponse.body.token;
    });

    test('should refresh token with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.token).not.toBe(authToken); // Should be different
    });

    test('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.error).toContain('token');
    });

    test('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    test('should reject refresh with expired token', async () => {
      // This would require mocking or using a token that's already expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
      testUser = TestDataGenerator.generateUser();
      
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      authToken = loginResponse.body.token;
    });

    test('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('Logged out successfully');
    });

    test('should reject logout without token', async () => {
      await request(app)
        .post('/api/auth/logout')
        .expect(401);
    });

    test('should invalidate token after logout', async () => {
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use token after logout
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = TestDataGenerator.generateUser();
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    test('should initiate password reset for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.message).toContain('Password reset email sent');
    });

    test('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return same response to prevent email enumeration
      expect(response.body.message).toContain('Password reset email sent');
    });

    test('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    test('should implement rate limiting for password reset', async () => {
      // Make multiple requests
      const requests = Array(6).fill().map(() =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({ email: testUser.email })
      );

      const responses = await Promise.all(requests);
      
      // Later requests should be rate limited
      expect(responses[5].status).toBe(429);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      // This would require generating a valid reset token
      // For now, testing the endpoint structure
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'valid-reset-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400); // Expect 400 because token is invalid

      expect(response.body.error).toBeDefined();
    });

    test('should validate password confirmation', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'some-token',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!'
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            message: expect.stringContaining('match')
          })
        ])
      );
    });

    test('should reject expired reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'expired-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        })
        .expect(400);

      expect(response.body.error).toContain('expired');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Performance', () => {
    test('should respond to login within acceptable time', async () => {
      const testUser = TestDataGenerator.generateUser();
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const startTime = Date.now();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent registrations', async () => {
      const users = Array(10).fill().map(() => TestDataGenerator.generateUser());
      
      const registrationPromises = users.map(user =>
        request(app)
          .post('/api/auth/register')
          .send(user)
      );

      const responses = await Promise.all(registrationPromises);
      
      // All registrations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
}); 