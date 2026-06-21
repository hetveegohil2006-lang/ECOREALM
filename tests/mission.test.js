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
    role: 'user',
    carbon_offset: 10,
    water_saved: 50,
    energy_conserved: 5,
    island: { trees: 1, flowers: 1 },
    achievements: [],
    history: []
  };

  const mockSingleMission = {
    id: 'mission-1',
    title: 'Commute Green',
    description: 'Commute Green Description',
    xp_reward: 50,
    eco_points_reward: 25,
    difficulty: 'easy',
    category: 'transport',
    carbon_impact: 3.5,
    water_impact: 0,
    energy_impact: 0.8,
    is_daily: true,
    is_recurring: true
  };

  const mockFrom = jest.fn().mockImplementation((tableName) => {
    const chain = {};
    let queryId = null;

    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockImplementation((field, val) => {
      if (field === 'id' || field === 'mission_id') {
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
      } else if (tableName === 'missions') {
        singleData = mockSingleMission;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [mockSingleProfile];
      } else if (tableName === 'missions') {
        data = [
          { id: 'mission-1', title: 'Commute Green', xp_reward: 50, eco_points_reward: 25, is_daily: true },
          { id: 'mission-2', title: 'Meatless Day', xp_reward: 40, eco_points_reward: 20, is_daily: false }
        ];
      } else if (tableName === 'user_missions') {
        data = [];
      } else if (tableName === 'user_badges') {
        data = [];
      }
      resolve({ data, count: data.length, error: null });
    });

    return chain;
  });

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'newguardian@example.com' } }, error: null })
    },
    from: mockFrom
  };

  return {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase
  };
});

describe('Missions Endpoints', () => {
  it('should get missions list successfully', async () => {
    const res = await request(app)
      .get('/api/missions')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.missions).toBeDefined();
  });

  it('should log a completed mission successfully', async () => {
    const res = await request(app)
      .post('/api/missions/complete')
      .set('Authorization', 'Bearer mock-token')
      .send({ missionId: 'mission-1' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('should get daily missions successfully', async () => {
    const res = await request(app)
      .get('/api/missions/daily')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.missions).toBeDefined();
  });
});
