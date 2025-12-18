import { jest } from '@jest/globals';

// 1. Mock dependencies BEFORE importing the module under test
// Mock userModel
const mockSave = jest.fn();
const mockUserModelConstructor = jest.fn().mockImplementation(() => ({
    save: mockSave
}));
// Attach static methods to the mock constructor
mockUserModelConstructor.findOne = jest.fn();

jest.unstable_mockModule('../../models/userModel.js', () => ({
    default: mockUserModelConstructor
}));

// Mock bcrypt
jest.unstable_mockModule('bcrypt', () => ({
    default: {
        compare: jest.fn(),
        genSalt: jest.fn(),
        hash: jest.fn()
    }
}));

// Mock jsonwebtoken
jest.unstable_mockModule('jsonwebtoken', () => ({
    default: {
        sign: jest.fn()
    }
}));

// Mock validator
jest.unstable_mockModule('validator', () => ({
    default: {
        isEmail: jest.fn()
    }
}));

// 2. Import module under test and mocked dependencies
const { registerUser, loginUser } = await import('../../controllers/userController.js');
const userModel = (await import('../../models/userModel.js')).default;
const bcrypt = (await import('bcrypt')).default;
const jwt = (await import('jsonwebtoken')).default;
const validator = (await import('validator')).default;

describe('User Controller', () => {
    let req, res;

    beforeEach(() => {
        // Reset mocks before each test to ensure Independence
        jest.clearAllMocks();

        // Setup mock request and response
        req = {
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis() // support chaining if needed (though controller uses res.json directly)
        };
    });

    describe('registerUser', () => {
        it('should register a new user successfully when valid data is provided', async () => {
            // Arrange
            req.body = { name: 'Test User', email: 'test@example.com', password: 'password123' };
            userModel.findOne.mockResolvedValue(null); // No existing user
            validator.isEmail.mockReturnValue(true); // Valid email
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashedPassword');
            mockSave.mockResolvedValue({ _id: 'user_id' }); // Mock save success
            jwt.sign.mockReturnValue('valid_token');

            // Act
            await registerUser(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(validator.isEmail).toHaveBeenCalledWith('test@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
            expect(mockUserModelConstructor).toHaveBeenCalledWith({
                name: 'Test User',
                email: 'test@example.com',
                password: 'hashedPassword'
            });
            expect(mockSave).toHaveBeenCalled();
            expect(jwt.sign).toHaveBeenCalledWith({ id: 'user_id' }, process.env.JWT_SECRET);
            expect(res.json).toHaveBeenCalledWith({ success: true, token: 'valid_token' });
        });

        it('should return error when user already exists', async () => {
            // Arrange
            req.body = { email: 'existing@example.com', password: 'password123' };
            userModel.findOne.mockResolvedValue({ _id: 'existing_id' }); // User exists

            // Act
            await registerUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "User already exists" });
            expect(mockSave).not.toHaveBeenCalled(); // Ensure no save happened
        });

        it('should return error when email is invalid', async () => {
            // Arrange
            req.body = { email: 'invalid-email', password: 'password123' };
            userModel.findOne.mockResolvedValue(null);
            validator.isEmail.mockReturnValue(false); // Invalid email

            // Act
            await registerUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Please enter a valid email" });
            expect(mockSave).not.toHaveBeenCalled();
        });

        it('should return error when password is too short', async () => {
            // Arrange
            req.body = { email: 'test@example.com', password: 'short' };
            userModel.findOne.mockResolvedValue(null);
            validator.isEmail.mockReturnValue(true);

            // Act
            await registerUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "please enter a strong password" });
            expect(mockSave).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            req.body = { name: 'Test', email: 'test@example.com', password: 'password123' };
            userModel.findOne.mockRejectedValue(new Error('DB Error')); // Simulate DB error

            // Act
            await registerUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Error" });
        });
    });

    describe('loginUser', () => {
        it('should login successfully with valid credentials', async () => {
            // Arrange
            req.body = { email: 'test@example.com', password: 'password123' };
            const mockUser = { _id: 'user_id', password: 'hashedPassword' };
            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(true); // Password matches
            jwt.sign.mockReturnValue('valid_token');

            // Act
            await loginUser(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
            expect(res.json).toHaveBeenCalledWith({ success: true, token: 'valid_token' });
        });

        it('should return error when user does not exist', async () => {
            // Arrange
            req.body = { email: 'nonexistent@example.com', password: 'password123' };
            userModel.findOne.mockResolvedValue(null); // No user found

            // Act
            await loginUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "User doesn't exist" });
        });

        it('should return error when password is incorrect', async () => {
            // Arrange
            req.body = { email: 'test@example.com', password: 'wrongpassword' };
            const mockUser = { _id: 'user_id', password: 'hashedPassword' };
            userModel.findOne.mockResolvedValue(mockUser);
            bcrypt.compare.mockResolvedValue(false); // Password does NOT match

            // Act
            await loginUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Invalid credentials" });
        });

        it('should handle errors during login', async () => {
            // Arrange
            req.body = { email: 'test@example.com', password: 'password123' };
            userModel.findOne.mockRejectedValue(new Error('DB Error'));

            // Act
            await loginUser(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Error" });
        });
    });
});
