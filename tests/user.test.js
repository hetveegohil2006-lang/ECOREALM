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
    carbon_offset: 10,
    water_saved: 50,
    energy_conserved: 5,
    net_zero_unlocked: false,
    custom_title_bought: false,
    scan_completed: true,
    role: 'user',
    island: { trees: 1, flowers: 1, waterCleanliness: 25, meadowGreenness: 25 },
    history: [],
    achievements: []
  };

  const mockFrom = jest.fn().mockImplementation((tableName) => {
    const chain = {};
    let queryId = null;

    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockImplementation((field, val) => {
      if (field === 'id') {
        queryId = val;
      }
      return chain;
    });

    chain.neq = jest.fn().mockReturnValue(chain);
    chain.or = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.range = jest.fn().mockReturnValue(chain);
    chain.in = jest.fn().mockReturnValue(chain);
    chain.gte = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockReturnValue(chain);
    chain.update = jest.fn().mockReturnValue(chain);
    chain.delete = jest.fn().mockReturnValue(chain);

    chain.single = jest.fn().mockImplementation(() => {
      let singleData = {};
      if (tableName === 'profiles') {
        singleData = mockSingleProfile;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [mockSingleProfile];
      } else if (tableName === 'user_badges') {
        data = [];
      }
      resolve({ data, count: data.length, error: null });
    });

    return chain;
  });

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'newguardian@example.com' } }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ error: null })
      }
    },
    from: mockFrom,
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.png' } })
      })
    }
  };

  return {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase
  };
});

describe('User Profile Endpoints', () => {
  it('should get user profile successfully', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toEqual('newguardian');
  });

  it('should update user profile details', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', 'Bearer mock-token')
      .send({
        username: 'updatedguardian',
        email: 'updated@example.com'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should change user password successfully', async () => {
    const res = await request(app)
      .put('/api/users/change-password')
      .set('Authorization', 'Bearer mock-token')
      .send({
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should get user stats successfully', async () => {
    const res = await request(app)
      .get('/api/users/stats')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.level).toBeDefined();
  });

  it('should send friend request successfully', async () => {
    const res = await request(app)
      .post('/api/users/friend-request/another-id')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should get friends leaderboard successfully', async () => {
    const res = await request(app)
      .get('/api/users/friends/leaderboard')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leaderboard).toBeDefined();
  });

  it('should delete user account successfully', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', 'Bearer mock-token')
      .send({
        password: 'password123'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
