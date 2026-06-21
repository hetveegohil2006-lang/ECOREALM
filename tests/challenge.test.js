const request = require('supertest');
const app = require('../app');

let mockUserChallengeExists = false;

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
    achievements: [],
    history: []
  };

  const mockSingleChallenge = {
    id: 'mock-challenge-id',
    title: 'Zero Waste Week',
    description: 'Produce zero landfill waste for 7 consecutive days.',
    type: 'individual',
    category: 'waste',
    difficulty: 'hard',
    xp_reward: 350,
    coin_reward: 175,
    goal: 7,
    unit: 'days',
    icon: '♻️',
    is_active: true
  };

  const mockUserChallenge = {
    id: 'user-challenge-1',
    user_id: 'mock-user-id',
    challenge_id: 'mock-challenge-id',
    progress: 3,
    completed_at: null
  };

  const mockFrom = jest.fn().mockImplementation((tableName) => {
    const chain = {};

    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
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
      } else if (tableName === 'challenges') {
        singleData = mockSingleChallenge;
      } else if (tableName === 'user_challenges') {
        singleData = mockUserChallenge;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.maybeSingle = jest.fn().mockImplementation(() => {
      let singleData = null;
      if (tableName === 'user_challenges' && mockUserChallengeExists) {
        singleData = mockUserChallenge;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [mockSingleProfile];
      } else if (tableName === 'challenges') {
        data = [mockSingleChallenge];
      } else if (tableName === 'user_challenges') {
        data = [{
          ...mockUserChallenge,
          challenges: mockSingleChallenge
        }];
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

describe('Challenge Endpoints', () => {
  beforeEach(() => {
    mockUserChallengeExists = false;
  });

  it('should get all active challenges successfully', async () => {
    const res = await request(app)
      .get('/api/challenges')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.challenges).toBeDefined();
  });

  it('should join a challenge successfully', async () => {
    mockUserChallengeExists = false;
    const res = await request(app)
      .post('/api/challenges/mock-challenge-id/join')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Joined challenge');
  });

  it('should fail joining challenge if already joined', async () => {
    mockUserChallengeExists = true;
    const res = await request(app)
      .post('/api/challenges/mock-challenge-id/join')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Already participating');
  });

  it('should update challenge progress successfully', async () => {
    mockUserChallengeExists = true;
    const res = await request(app)
      .put('/api/challenges/mock-challenge-id/progress')
      .set('Authorization', 'Bearer mock-token')
      .send({ increment: 2 });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.progress).toEqual(5);
  });

  it('should complete challenge successfully when goal is reached', async () => {
    mockUserChallengeExists = true;
    const res = await request(app)
      .put('/api/challenges/mock-challenge-id/progress')
      .set('Authorization', 'Bearer mock-token')
      .send({ increment: 5 }); // 3 + 5 >= 7 goal

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.completed).toBe(true);
  });

  it('should get user\'s joined challenges successfully', async () => {
    const res = await request(app)
      .get('/api/challenges/my')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.challenges).toBeDefined();
  });
});
