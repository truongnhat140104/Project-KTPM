import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import foodModel from '../../models/foodModel.js';
import path from 'path';
import fs from 'fs';

// Helper to create a dummy image for testing
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testImagePath = path.join(__dirname, 'test_image.jpg');

beforeAll(async () => {
    // Determine the mongo URI. 
    // Ideally use a separate test database to avoid data pollution.
    const dbUri = process.env.MONGO_URI || 'mongodb+srv://elvis140104_db_user:1234566@cluster1.mnnl32w.mongodb.net/food-delivery-test';

    // Connect to mongoose
    await mongoose.connect(dbUri);

    // Create dummy image file
    fs.writeFileSync(testImagePath, 'dummy content');
});

afterAll(async () => {
    // Cleanup: Remove the dummy food item if it exists (optional, depends on test strategy)
    // await foodModel.deleteMany({ name: 'Integration Test Food' }); // Be careful with deleteMany!

    // Remove dummy image file
    if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
    }

    // Close connection
    await mongoose.connection.close();
});

describe('Food API Integration Tests', () => {

    let createdFoodId;

    test('POST /api/food/add - should add a new food item', async () => {
        const response = await request(app)
            .post('/api/food/add')
            .field('name', 'Integration Test Food')
            .field('description', 'Test Description')
            .field('price', 10)
            .field('category', 'Salad')
            .attach('image', testImagePath);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Food Added');

        // Verify it's in the DB
        const food = await foodModel.findOne({ name: 'Integration Test Food' });
        expect(food).toBeTruthy();
        expect(food.description).toBe('Test Description');
        createdFoodId = food._id;
    });

    test('GET /api/food/list - should return a list of foods', async () => {
        const response = await request(app).get('/api/food/list');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);

        // Assert that our created food is in the list
        const found = response.body.data.find(f => f.name === 'Integration Test Food');
        expect(found).toBeTruthy();
    });

    test('POST /api/food/remove - should remove the food item', async () => {
        // We need the ID from the previous test or DB query
        expect(createdFoodId).toBeDefined();

        const response = await request(app)
            .post('/api/food/remove')
            .send({ id: createdFoodId });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Food removed');

        // Verify it's gone
        const food = await foodModel.findById(createdFoodId);
        expect(food).toBeNull();
    });

});
