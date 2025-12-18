import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';

// Mock models and fs
jest.unstable_mockModule('../../models/foodModel.js', () => ({
    default: jest.fn()
}));
jest.unstable_mockModule('fs', () => ({
    default: {
        unlink: jest.fn(),
        existsSync: jest.fn().mockReturnValue(true),
        mkdirSync: jest.fn()
    }
}));
// Mock authentication middleware if needed, but not used in this public route? 
// Actually food add route uses upload middleware which uses multer. 
// Multer depends on fs.

// Dynamic imports
const { app } = await import('../../server.js');
const foodModel = (await import('../../models/foodModel.js')).default;

describe('Food Route Integration (Mocked DB)', () => {

    beforeAll(() => {
        // Setup mocks
        foodModel.find = jest.fn();
        // Mock save on instance
        foodModel.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({ _id: 'foodId' })
        }));
    });

    it('should add a new food item via POST /api/food/add', async () => {
        const res = await request(app)
            .post('/api/food/add')
            .field('name', 'Burger')
            .field('description', 'Tasty')
            .field('price', 10)
            .field('category', 'Fast Food')
            .attach('image', Buffer.from('fake image'), 'burger.jpg');

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe("Food Added");
        expect(foodModel).toHaveBeenCalled(); // Constructor called
    });

    it('should list all food items via GET /api/food/list', async () => {
        const mockFoods = [{ name: 'Burger' }, { name: 'Pizza' }];
        foodModel.find.mockResolvedValue(mockFoods);

        const res = await request(app).get('/api/food/list');
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(2);
        expect(foodModel.find).toHaveBeenCalled();
    });
});
