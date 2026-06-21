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

  const mockSingleNotif = {
    id: 'notif-1',
    recipient: 'mock-user-id',
    title: 'Level Up',
    message: 'Congrats on Level 2!',
    is_read: false,
    created_at: new Date(),
    sender_profile: mockSingleProfile
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
        singleData = mockSingleNotif;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [mockSingleProfile];
      } else {
        data = [mockSingleNotif];
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

describe('Notifications Endpoints', () => {
  it('should get notifications successfully', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should mark a notification as read successfully', async () => {
    const res = await request(app)
      .put('/api/notifications/notif-1/read')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
