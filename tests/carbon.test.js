const request = require('supertest');
const app = require('../app');

// Mock supabase module
jest.mock('../lib/supabase', () => {
  const mockSingle = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      data: {
        id: 'mock-user-id',
        user_id: 'mock-user-id',
        username: 'newguardian',
        email: 'newguardian@example.com',
        level: 1,
        xp: 0,
        eco_points: 100,
        guardian_rank: 'Seed Guardian',
        carbon_score: 5.5,
        period: '2026-06',
        transportation: 1.5,
        energy: 1.0,
        food: 1.0,
        waste: 0.5,
        water: 0.3,
        shopping: 0.5,
        compared_to_average: 14.5,
        improvement_areas: ['Switch to smart/LED devices']
      },
      error: null
    });
  });

  const mockFrom = jest.fn().mockImplementation((table) => {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSingle,
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockImplementation(() => {
        return {
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'new-assessment-id',
              user_id: 'mock-user-id',
              carbon_score: 12.0,
              period: '2026-06',
              transportation: 2.0,
              energy: 2.0,
              food: 2.0,
              waste: 2.0,
              water: 2.0,
              shopping: 2.0,
              compared_to_average: 20.0,
              improvement_areas: ['Grow trees']
            },
            error: null
          })
        };
      })
    };
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

describe('Carbon Assessment Endpoints', () => {
  it('should get the latest carbon assessment successfully', async () => {
    const res = await request(app)
      .get('/api/carbon/latest')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.annualScore).toBeDefined();
  });

  it('should log a new carbon assessment successfully', async () => {
    const res = await request(app)
      .post('/api/carbon')
      .set('Authorization', 'Bearer mock-token')
      .send({
        breakdown: {
          travel: 1.5,
          food: 1.0,
          electricity: 1.0,
          waste: 0.5,
          water: 0.3,
          shopping: 0.5
        },
        period: '2026-06',
        notes: 'Test assessment'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });

  it('should fail logging a new carbon assessment with invalid input values', async () => {
    const res = await request(app)
      .post('/api/carbon')
      .set('Authorization', 'Bearer mock-token')
      .send({
        breakdown: {
          travel: 'not-a-number',
          food: 1.0
        }
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });
});
