const request = require('supertest');
const app = require('../app');

let mockCoins = 100;
let mockIsLocked = true;

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
    net_zero_unlocked: false,
    custom_title_bought: false
  };

  const mockRegion = {
    id: 'region-6',
    name: 'Net-Zero Future Hub',
    description: 'Future Hub',
    icon: '🏢',
    category: 'general',
    color: '#00ff00',
    position: [0, 0, 0],
    is_locked: true,
    unlock_cost: 150,
    trees_planted: 10,
    carbon_reduced: 25,
    waste_recycled: 5,
    water_saved: 100,
    restoration_percent: 15,
    contributors: []
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
      let data = {};
      if (tableName === 'profiles') {
        data = { ...mockSingleProfile, eco_points: mockCoins };
      } else {
        data = { ...mockRegion, is_locked: mockIsLocked };
      }
      return Promise.resolve({ data, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [{ ...mockSingleProfile, eco_points: mockCoins }];
      } else {
        data = [{ ...mockRegion, is_locked: mockIsLocked }];
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

describe('World/Regions Endpoints', () => {
  beforeEach(() => {
    mockCoins = 100;
    mockIsLocked = true;
  });

  it('should get world regions successfully', async () => {
    const res = await request(app)
      .get('/api/world')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.regions).toBeDefined();
  });

  it('should fail unlocking region if not enough coins', async () => {
    mockCoins = 100;
    mockIsLocked = true;
    const res = await request(app)
      .post('/api/world/region-6/unlock')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Insufficient');
  });

  it('should unlock region successfully with enough coins', async () => {
    mockCoins = 200;
    mockIsLocked = true;
    const res = await request(app)
      .post('/api/world/region-6/unlock')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('unlocked');
  });

  it('should fail unlocking region if already unlocked', async () => {
    mockCoins = 200;
    mockIsLocked = false;
    const res = await request(app)
      .post('/api/world/region-6/unlock')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already unlocked');
  });

  it('should fail contributing to a locked region', async () => {
    mockIsLocked = true;
    const res = await request(app)
      .post('/api/world/region-6/contribute')
      .set('Authorization', 'Bearer mock-token')
      .send({ trees: 5 });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('locked');
  });

  it('should contribute successfully to an unlocked region', async () => {
    mockIsLocked = false;
    const res = await request(app)
      .post('/api/world/region-6/contribute')
      .set('Authorization', 'Bearer mock-token')
      .send({ trees: 5, carbon: 10, waste: 2, water: 50 });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Contributed');
  });

  it('should get global restoration summary successfully', async () => {
    const res = await request(app)
      .get('/api/world/summary');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
  });
});
