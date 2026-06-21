const request = require('supertest');
const app = require('../app');

// Mock supabase module
jest.mock('../lib/supabase', () => {
  const mockFrom = jest.fn().mockImplementation((tableName) => {
    const chain = {};
    let queryId = null;
    let isExactCount = false;

    chain.select = jest.fn().mockImplementation((col, opts) => {
      if (opts && opts.count === 'exact') {
        isExactCount = true;
      }
      return chain;
    });

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
        if (queryId === 'mock-admin-id' || queryId === undefined) {
          singleData = {
            id: 'mock-admin-id',
            username: 'admin-guardian',
            email: 'admin@ecorealm.org',
            level: 10,
            xp: 1500,
            eco_points: 500,
            guardian_rank: 'Forest Protector',
            role: 'admin',
            carbon_offset: 100,
            water_saved: 1000,
            energy_conserved: 150,
            net_zero_unlocked: true,
            custom_title_bought: true,
            scan_completed: true,
            island: { trees: 10, flowers: 10 },
            history: [],
            achievements: []
          };
        } else {
          singleData = {
            id: queryId || 'user-1',
            username: 'user1',
            email: 'user1@example.com',
            role: 'user',
            created_at: new Date()
          };
        }
      } else if (tableName === 'missions') {
        singleData = { id: 'mission-1', title: 'New Mission', xp_reward: 100, eco_points_reward: 50 };
      } else if (tableName === 'community_posts') {
        singleData = { id: 'post-1', user_id: 'user-1', title: 'Planting Trees' };
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      let count = null;

      if (isExactCount) {
        count = 5;
      }

      if (tableName === 'profiles') {
        data = [
          { id: 'user-1', username: 'user1', email: 'user1@example.com', role: 'user', created_at: new Date() }
        ];
      } else if (tableName === 'missions') {
        data = [
          { id: 'mission-1', title: 'Commute Green', xp_reward: 50, eco_points_reward: 25, is_daily: true }
        ];
      } else if (tableName === 'community_posts') {
        data = [];
      } else if (tableName === 'assessments') {
        data = [
          { carbon_score: 15.0 },
          { carbon_score: 25.0 }
        ];
      }

      resolve({ data, count, error: null });
    });

    return chain;
  });

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-admin-id', email: 'admin@ecorealm.org' } }, error: null }),
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ error: null })
      }
    },
    from: mockFrom
  };

  return {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase
  };
});

describe('Admin Endpoints', () => {
  it('should get analytics successfully', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics.totalUsers).toBeDefined();
  });

  it('should get users list with pagination', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=25')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.users).toBeDefined();
  });

  it('should update a user role successfully', async () => {
    const res = await request(app)
      .put('/api/admin/users/user-1/role')
      .set('Authorization', 'Bearer mock-token')
      .send({ role: 'moderator' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should ban/delete user account successfully', async () => {
    const res = await request(app)
      .delete('/api/admin/users/user-1')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should create a new mission successfully', async () => {
    const res = await request(app)
      .post('/api/admin/missions')
      .set('Authorization', 'Bearer mock-token')
      .send({
        title: 'New Mission',
        description: 'New Mission Description',
        xpReward: 100,
        coinReward: 50,
        difficulty: 'medium',
        category: 'water',
        carbonImpact: 2.5,
        waterImpact: 100,
        energyImpact: 0
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });

  it('should create a new challenge successfully', async () => {
    const res = await request(app)
      .post('/api/admin/challenges')
      .set('Authorization', 'Bearer mock-token')
      .send({
        title: 'New Challenge',
        description: 'New Challenge Description',
        xpReward: 200,
        coinReward: 100,
        difficulty: 'hard'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });

  it('should delete a community post successfully', async () => {
    const res = await request(app)
      .delete('/api/admin/posts/post-1')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
