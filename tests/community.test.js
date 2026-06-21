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

  const mockSinglePost = {
    id: 'post-1',
    user_id: 'mock-user-id',
    title: 'Planting Trees',
    content: 'Did some planting today and it was really fun!',
    category: 'tips',
    likes: [],
    created_at: new Date(),
    author: mockSingleProfile
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
        singleData = mockSinglePost;
      }
      return Promise.resolve({ data: singleData, error: null });
    });

    chain.then = jest.fn().mockImplementation((resolve) => {
      let data = [];
      if (tableName === 'profiles') {
        data = [mockSingleProfile];
      } else {
        data = [mockSinglePost];
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

describe('Community Endpoints', () => {
  it('should get community feed successfully', async () => {
    const res = await request(app)
      .get('/api/community/feed')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.posts).toBeDefined();
  });

  it('should create a community post successfully', async () => {
    const res = await request(app)
      .post('/api/community/post')
      .set('Authorization', 'Bearer mock-token')
      .send({
        title: 'New Post Title',
        content: 'This is the post content and it needs to be longer than the threshold.',
        category: 'tips'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
  });

  it('should fail creating a post with empty title', async () => {
    const res = await request(app)
      .post('/api/community/post')
      .set('Authorization', 'Bearer mock-token')
      .send({
        title: '',
        content: 'This is the post content.',
        category: 'tips'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('should like a community post successfully', async () => {
    const res = await request(app)
      .put('/api/community/post/post-1/like')
      .set('Authorization', 'Bearer mock-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});
