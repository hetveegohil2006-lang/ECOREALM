const request = require('supertest');
const app = require('../app');

// Mock openai module for recommendations
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    recommendations: [
                      'Opt for public transit options.',
                      'Upgrade to LED lights.',
                      'Eat one vegetarian meal a day.',
                      'Set up a home recycle bin.'
                    ]
                  })
                }
              }
            ]
          })
        }
      }
    };
  });
});

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
    scan_completed: false
  };

  const mockSingleAssessment = {
    id: 'assessment-1',
    user_id: 'mock-user-id',
    transportation: 5,
    energy: 5,
    food: 5,
    waste: 5,
    water: 5,
    shopping: 5,
    carbon_score: 15.0,
    created_at: new Date()
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
      } else {
        singleData = mockSingleAssessment;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [mockSingleProfile];
      } else {
        data = [mockSingleAssessment];
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

describe('Diagnostic Assessment Endpoints', () => {
  it('should get latest diagnostic assessment successfully', async () => {
    const res = await request(app)
      .get('/api/diagnostic/result')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBeDefined();
  });

  it('should post new diagnostic assessment successfully', async () => {
    const res = await request(app)
      .post('/api/diagnostic/submit')
      .set('Authorization', 'Bearer mock-token')
      .send({
        transportation: 5.5,
        energy: 4.0,
        food: 3.5,
        waste: 2.2,
        water: 1.8,
        shopping: 2.6
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.result.recommendations).toBeDefined();
  });

  it('should fail posting diagnostic with invalid schema values', async () => {
    const res = await request(app)
      .post('/api/diagnostic/submit')
      .set('Authorization', 'Bearer mock-token')
      .send({
        transportation: 'string-instead-of-number',
        energy: 4.0
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });
});
