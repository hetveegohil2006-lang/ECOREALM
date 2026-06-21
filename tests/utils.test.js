const nodemailer = require('nodemailer');
const xpEngine = require('../utils/xpEngine');
const errorHandler = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

// Mock nodemailer
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-mail-id' })
    })
  };
});

describe('XP Engine utility functions', () => {
  it('should calculate correct level from total XP', () => {
    expect(xpEngine.getLevelFromXP(0)).toEqual(1);
    expect(xpEngine.getLevelFromXP(50)).toEqual(1);
    expect(xpEngine.getLevelFromXP(100)).toEqual(2);
    expect(xpEngine.getLevelFromXP(5000)).toBeGreaterThan(1);
  });

  it('should get XP required for next level', () => {
    expect(xpEngine.getXPForNextLevel(1)).toEqual(100);
    expect(xpEngine.getXPForNextLevel(2)).toEqual(240);
  });

  it('should return correct rank based on level', () => {
    expect(xpEngine.getRankFromLevel(1)).toEqual('Seed Guardian');
    expect(xpEngine.getRankFromLevel(5)).toEqual('Sprout Keeper');
    expect(xpEngine.getRankFromLevel(10)).toEqual('Forest Protector');
    expect(xpEngine.getRankFromLevel(20)).toEqual('Climate Ranger');
    expect(xpEngine.getRankFromLevel(30)).toEqual('Earth Defender');
    expect(xpEngine.getRankFromLevel(50)).toEqual('Planet Savior');
  });

  it('should return correct avatar tier', () => {
    expect(xpEngine.getAvatarTier(1)).toEqual('seed_guardian');
    expect(xpEngine.getAvatarTier(5)).toEqual('sprout_keeper');
  });

  it('should evaluate badge completion conditions', () => {
    const user = {
      waterSaved: 600,
      energyConserved: 20,
      carbonOffset: 60,
      level: 15,
      island: { trees: 6 },
      history: [
        { name: 'Recycle paper' },
        { name: 'Sort plastic' },
        { name: 'Recycle bottles' },
        { name: 'Sort glass' },
        { name: 'Recycle waste' },
        { name: 'Commute Green Transit' },
        { name: 'Commute Bike' },
        { name: 'Commute Walk' },
        { name: 'Commute Green Bus' },
        { name: 'Commute Rail' }
      ]
    };
    const earned = xpEngine.checkBadges(user, []);
    expect(earned.length).toBeGreaterThan(0);
  });

  it('should evaluate achievements completion conditions', () => {
    const user = {
      carbonOffset: 120,
      level: 35,
      coins: 600,
      history: [{ name: 'First steps' }],
      badges: new Array(10).fill({})
    };
    const earned = xpEngine.checkAchievements(user, []);
    expect(earned.length).toBeGreaterThan(0);
  });
});

describe('Email Service', () => {
  it('should call nodemailer sendMail when sending emails', async () => {
    process.env.SMTP_FROM = 'noreply@ecorealm.org';
    const info = await emailService.sendEmail({
      to: 'guardian@example.com',
      subject: 'Test',
      html: '<h1>Test</h1>'
    });
    expect(info.messageId).toEqual('mock-mail-id');
  });

  it('should send verification email successfully', async () => {
    await emailService.sendVerificationEmail({ email: 'g@example.com', username: 'G' }, 'token123');
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });

  it('should send password reset email successfully', async () => {
    await emailService.sendPasswordResetEmail({ email: 'g@example.com' }, 'token123');
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });
});

describe('Error Handling Middleware', () => {
  it('should return JSON error response for API routes', () => {
    const req = {
      method: 'GET',
      url: '/api/some-route',
      path: '/api/some-route',
      headers: {}
    };
    
    let responseStatus = 200;
    let jsonResponse = null;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      }
    };
    const next = jest.fn();

    const error = new Error('Database connection failed');
    error.statusCode = 500;

    errorHandler(error, req, res, next);

    expect(responseStatus).toEqual(500);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toEqual('Database connection failed');
  });

  it('should render HTML 500 view for standard web routes', () => {
    const req = {
      method: 'GET',
      url: '/dashboard',
      path: '/dashboard',
      headers: {
        accept: 'text/html'
      }
    };
    
    let renderedView = null;
    let responseStatus = 200;
    
    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      render(view, data) {
        renderedView = view;
        return this;
      }
    };
    const next = jest.fn();

    const error = new Error('Rendering failed');
    errorHandler(error, req, res, next);

    expect(renderedView).toEqual('500');
  });
});
