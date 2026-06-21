const request = require('supertest');
const app = require('../app');

// Mock supabase module
jest.mock('../lib/supabase', () => {
  const mockSingleProfile = {
    id: 'mock-user-id',
    username: 'newguardian',
    email: 'newguardian@example.com',
    level: 1,
    xp: 0,
    eco_points: 100,
    guardian_rank: 'Seed Guardian',
    role: 'user'
  };

  const mockFrom = jest.fn().mockImplementation((tableName) => {
    const chain = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: mockSingleProfile, error: null });
    chain.insert = jest.fn().mockResolvedValue({ data: { id: 'mock-user-id' }, error: null });
    return chain;
  });

  const mockSupabase = {
    auth: {
      signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' }, session: { access_token: 'mock-token' } }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id' }, session: { access_token: 'mock-token' } }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'newguardian@example.com' } }, error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      refreshSession: jest.fn().mockResolvedValue({ data: { session: { access_token: 'new-mock-token' } }, error: null })
    },
    from: mockFrom
  };

  const mockSupabaseAdmin = {
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'mock-user-id', email: 'newguardian@example.com' } },
          error: null
        }),
        updateUserById: jest.fn().mockResolvedValue({ error: null })
      }
    }
  };

  return {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabaseAdmin
  };
});

describe('Authentication Endpoints', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'newguardian',
        email: 'newguardian@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toEqual('newguardian');
  });

  it('should login an existing user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newguardian@example.com',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  it('should fail registration with invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        username: 'u', // too short
        email: 'invalid-email',
        password: '12' // too short
      });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should logout successfully', async () => {
    const res = await request(app)
      .get('/api/auth/logout')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Logged out');
  });

  it('should get current logged-in user details', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
  });

  it('should initiate forgot-password reset flow', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'newguardian@example.com' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Password reset link sent');
  });

  it('should reset password successfully', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password/mock-token')
      .set('Authorization', 'Bearer mock-token')
      .send({ password: 'new-secure-password-123', userId: 'mock-user-id' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should verify email successfully', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email/mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should refresh access token successfully', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken: 'mock-refresh-token' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });
});
