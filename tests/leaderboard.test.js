const request = require('supertest');
const app = require('../app');

// Mock supabase module
jest.mock('../lib/supabase', () => {
  const mockProfile = {
    id: 'mock-user-id',
    username: 'guardian1',
    email: 'user1@example.com',
    level: 5,
    xp: 600,
    eco_points: 100,
    guardian_rank: 'Sprout Keeper',
    role: 'admin'
  };

  const mockProfilesList = [
    { id: 'user-1', username: 'guardian1', level: 5, xp: 600, guardian_rank: 'Sprout Keeper', carbon_offset: 12.0, eco_points: 100 },
    { id: 'user-2', username: 'guardian2', level: 3, xp: 350, guardian_rank: 'Seed Guardian', carbon_offset: 4.5, eco_points: 50 }
  ];

  const mockFrom = jest.fn().mockImplementation((table) => {
    const chain = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.neq = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.single = jest.fn().mockResolvedValue({ data: mockProfile, error: null });
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: mockProfile, error: null });

    chain.then = jest.fn().mockImplementation((resolve) => {
      resolve({ data: mockProfilesList, error: null });
    });

    return chain;
  });

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'user1@example.com' } }, error: null })
    },
    from: mockFrom
  };

  return {
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase
  };
});

describe('Leaderboard Endpoints', () => {
  it('should get global leaderboard successfully', async () => {
    const res = await request(app)
      .get('/api/leaderboard/global')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leaderboard).toBeDefined();
    expect(res.body.leaderboard.length).toBe(2);
  });

  it('should get weekly leaderboard successfully', async () => {
    const res = await request(app)
      .get('/api/leaderboard/weekly')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leaderboard).toBeDefined();
  });

  it('should get monthly leaderboard successfully', async () => {
    const res = await request(app)
      .get('/api/leaderboard/monthly')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leaderboard).toBeDefined();
  });

  it('should get friends leaderboard successfully', async () => {
    const res = await request(app)
      .get('/api/leaderboard/friends')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.leaderboard).toBeDefined();
  });

  it('should emit live updates successfully', async () => {
    const res = await request(app)
      .post('/api/leaderboard/emit')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('emitted');
  });
});
