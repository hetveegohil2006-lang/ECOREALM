const request = require('supertest');
const app = require('../app');

// Mock openai module
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Hello, Guardian! Your restoration efforts are looking stellar!'
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
    carbon_offset: 10,
    water_saved: 50,
    energy_conserved: 5,
    coach_history: [{ role: 'user', content: 'hello' }, { role: 'assistant', content: 'hi' }]
  };

  const mockFrom = jest.fn().mockImplementation((tableName) => {
    const chain = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);

    chain.single = jest.fn().mockImplementation(() => {
      let data = {};
      if (tableName === 'profiles') {
        data = mockSingleProfile;
      } else if (tableName === 'assessments') {
        data = {
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
      }
      return Promise.resolve({ data, error: null });
    });

    chain.update = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockResolvedValue({ data: [], error: null });
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

describe('AI Coach Endpoints', () => {
  it('should chat with AI coach successfully', async () => {
    const res = await request(app)
      .post('/api/coach/chat')
      .set('Authorization', 'Bearer mock-token')
      .send({
        message: 'How can I reduce carbon emissions?'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toBeDefined();
  });

  it('should fail chat with empty message', async () => {
    const res = await request(app)
      .post('/api/coach/chat')
      .set('Authorization', 'Bearer mock-token')
      .send({
        message: ''
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should get chat history successfully', async () => {
    const res = await request(app)
      .get('/api/coach/history')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toBeDefined();
  });

  it('should get AI-powered recommendations successfully', async () => {
    const res = await request(app)
      .post('/api/coach/recommendations')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recommendations).toBeDefined();
  });

  it('should clear chat history successfully', async () => {
    const res = await request(app)
      .delete('/api/coach/history')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('cleared');
  });
});
