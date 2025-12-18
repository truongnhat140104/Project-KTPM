import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

// Mock models and heavy dependencies
const mockUserModel = jest.fn();
mockUserModel.findOne = jest.fn();

jest.unstable_mockModule('../../models/userModel.js', () => ({
    default: mockUserModel
}));

jest.unstable_mockModule('bcrypt', () => ({
    default: {
        compare: jest.fn(),
        genSalt: jest.fn(),
        hash: jest.fn()
    }
}));
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign: jest.fn().mockReturnValue('mocked_token')
    }
}));
jest.unstable_mockModule('validator', () => ({
    default: {
        isEmail: jest.fn().mockReturnValue(true)
    }
}));

// Dynamic imports
const { app } = await import('../../server.js');
const userModel = (await import('../../models/userModel.js')).default;
const bcrypt = (await import('bcrypt')).default;

describe('User Route Integration (Mocked DB)', () => {

    beforeAll(() => {
        // Reset mocks if needed, but since they are const, better to just modify behavior
        userModel.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({ _id: 'userId' })
        }));
    });

    it('should register a new user via POST /api/user/register', async () => {
        userModel.findOne.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('hashed_password');

        const res = await request(app)
            .post('/api/user/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBe('mocked_token');
    });

    it('should login with registered user via POST /api/user/login', async () => {
        const mockUser = { _id: 'userId', password: 'hashed_password' };
        userModel.findOne.mockResolvedValue(mockUser);
        bcrypt.compare.mockResolvedValue(true);

        const res = await request(app)
            .post('/api/user/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBe('mocked_token');
    });
});
