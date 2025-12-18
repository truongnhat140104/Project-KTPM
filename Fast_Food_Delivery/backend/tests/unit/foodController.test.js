import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../models/foodModel.js', () => ({
    default: jest.fn()
}));

jest.unstable_mockModule('fs', () => ({
    default: {
        unlink: jest.fn()
    }
}));

const { addFood, listFood, removeFood } = await import('../../controllers/foodController.js');
const foodModel = (await import('../../models/foodModel.js')).default;
const fs = (await import('fs')).default;

describe('Food Controller', () => {
    let req, res;

    beforeEach(() => {
        req = { body: {}, file: {} };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
        jest.clearAllMocks();

        // Reset static methods
        foodModel.find = jest.fn();
        foodModel.findById = jest.fn();
        foodModel.findByIdAndDelete = jest.fn();
    });

    describe('addFood', () => {
        it('should add food successfully', async () => {
            req.body = { name: 'Burger', description: 'Tasty', price: 10, category: 'Fast Food' };
            req.file = { filename: 'burger.jpg' };

            const mockSave = jest.fn().mockResolvedValue({ _id: 'foodId' });
            foodModel.mockImplementation(() => ({
                save: mockSave
            }));

            await addFood(req, res);

            expect(mockSave).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ success: true, message: "Food Added" });
        });

        it('should handle error during add food', async () => {
            req.file = { filename: 'burger.jpg' };

            const mockSave = jest.fn().mockRejectedValue(new Error('Save failed'));
            foodModel.mockImplementation(() => ({
                save: mockSave
            }));

            await addFood(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "Error" });
        });
    });

    describe('listFood', () => {
        it('should list all foods', async () => {
            const mockFoods = [{ name: 'Burger' }, { name: 'Pizza' }];
            foodModel.find.mockResolvedValue(mockFoods);

            await listFood(req, res);

            expect(foodModel.find).toHaveBeenCalledWith({});
            expect(res.json).toHaveBeenCalledWith({ success: true, data: mockFoods });
        });

        it('should handle error during list food', async () => {
            foodModel.find.mockRejectedValue(new Error('Fetch failed'));

            await listFood(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "error" });
        });
    });

    describe('removeFood', () => {
        it('should remove food successfully', async () => {
            req.body = { id: 'foodId' };
            const mockFood = { image: 'image.jpg' };
            foodModel.findById.mockResolvedValue(mockFood);
            foodModel.findByIdAndDelete.mockResolvedValue(true);
            fs.unlink.mockImplementation((path, cb) => cb(null));

            await removeFood(req, res);

            expect(foodModel.findById).toHaveBeenCalledWith('foodId');
            expect(fs.unlink).toHaveBeenCalled();
            expect(foodModel.findByIdAndDelete).toHaveBeenCalledWith('foodId');
            expect(res.json).toHaveBeenCalledWith({ success: true, message: "Food removed" });
        });

        it('should handle error during remove food', async () => {
            req.body = { id: 'foodId' };
            foodModel.findById.mockRejectedValue(new Error('Find failed'));

            await removeFood(req, res);

            expect(res.json).toHaveBeenCalledWith({ success: false, message: "error" });
        });
    });
});
