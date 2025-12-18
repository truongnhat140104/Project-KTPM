import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../models/userModel.js', () => ({
    default: jest.fn()
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
        sign: jest.fn()
    }
}));

jest.unstable_mockModule('validator', () => ({
    default: {
        isEmail: jest.fn()
    }
}));

const { loginUser, registerUser } = await import('../../controllers/userController.js');
const userModel = (await import('../../models/userModel.js')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;
const validator = (await import('validator')).default;

describe('User Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {} };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        jest.clearAllMocks();

        // Reset userModel static methods
        userModel.findOne = jest.fn();
    });

    describe('registerUser', () => {
        it('should register a new user successfully', async () => {
            req.body = { name: 'Test User', email: 'test@example.com', password: 'password123' };

            userModel.findOne.mockResolvedValue(null);
            validator.isEmail.mockReturnValue(true);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');

            const mockSave = jest.fn().mockResolvedValue({ _id: 'userId' });
            userModel.mockImplementation(() => ({
                save: mockSave
            }));

            jwt.sign.mockReturnValue('token');

            await registerUser(req, res);

            expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(validator.isEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
            expect(res.json).toHaveBeenCalledWith({ success: true, token: 'token' });
        });

        it('should return error if user already exists', async () => {
            req.body = { email: 'test@example.com' };
            userModel.findOne.mockResolvedValue({ _id: 'existingUser' });

            await registerUser(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "User already exists" });
        });

        it('should return error for invalid email', async () => {
            req.body = { email: 'invalid-email' };
            userModel.findOne.mockResolvedValue(null);
            validator.isEmail.mockReturnValue(false);

            await registerUser(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Please enter a valid email" });
        });

        it('should return error for weak password', async () => {
            req.body = { email: 'test@example.com', password: 'weak' };
            userModel.findOne.mockResolvedValue(null);
            validator.isEmail.mockReturnValue(true);

            await registerUser(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "please enter a strong password" });
        });
    });

    describe('loginUser', () => {
        it('should login user successfully', async () => {
            req.body = { email: 'test@example.com', password: 'password123' };
            const mockUser = { _id: 'userId', password: 'hashedPassword' };
            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('token');

            await loginUser(req, res);

            expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(res.json).toHaveBeenCalledWith({ success: true, token: 'token' });
        });

        it('should return error if user does not exist', async () => {
            req.body = { email: 'test@example.com' };
            userModel.findOne.mockResolvedValue(null);

            await loginUser(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "User doesn't exist" });
        });

        it('should return error for invalid credentials', async () => {
            req.body = { email: 'test@example.com', password: 'wrongPassword' };
            const mockUser = { _id: 'userId', password: 'hashedPassword' };
            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false);

            await loginUser(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid credentials" });
        });
    });
});
