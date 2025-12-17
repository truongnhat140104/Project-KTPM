
import { jest } from '@jest/globals';

// Define mocks BEFORE importing the module under test
// Mock Stripe
const mockSessionCreate = jest.fn();
const mockStripeInstance = {
    checkout: {
        sessions: {
            create: mockSessionCreate
        }
    }
};
// The mock factory must return a class (constructor function)
const MockStripe = jest.fn(() => mockStripeInstance);

jest.unstable_mockModule('stripe', () => ({
    default: MockStripe
}));

// Mock Models
const mockOrderSave = jest.fn();
const mockOrderFindByIdAndUpdate = jest.fn();
const mockOrderFindByIdAndDelete = jest.fn();
// Mocking the model constructor and static methods
// Mongoose Default export is the model constructor, which also has static methods attached.
// But our code does: import orderModel ... new orderModel(...) AND orderModel.findById...
// So the default export needs to be a function (class) that has static methods.

const mockOrderModel = jest.fn(function (data) {
    this.save = mockOrderSave;
    Object.assign(this, data);
});
mockOrderModel.findByIdAndUpdate = mockOrderFindByIdAndUpdate;
mockOrderModel.findByIdAndDelete = mockOrderFindByIdAndDelete;
mockOrderModel.find = jest.fn(); // usage in other methods if tested, but strictly focused on UTCs here which use findById...

jest.unstable_mockModule('../models/orderModel.js', () => ({
    default: mockOrderModel
}));

const mockUserFindByIdAndUpdate = jest.fn();
jest.unstable_mockModule('../models/userModel.js', () => ({
    default: {
        findByIdAndUpdate: mockUserFindByIdAndUpdate
    }
}));


// Now import the controller dynamically
const { placeOrder, verifyOrder } = await import('../controllers/orderController.js');

// Also import things needed for assertions if not exposed by the mock module setup above
// (We already have access to the mock functions via the variables defined)

describe('Order Controller Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        jest.clearAllMocks();

        // Reset specific mock implementations if needed, or rely on internal logic
        // Since we perform distinct tests, clearAllMocks clears call history. 
        // We need to set default success returns.
    });

    // UTC-01: Validate: Thiếu thông tin bắt buộc
    test('UTC-01: Should return 400 if required info is missing', async () => {
        req.body = {
            phone: "",
            address: "HCM"
        };

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Missing info"
        }));
        expect(mockOrderSave).not.toHaveBeenCalled();
    });

    // UTC-02: Validate: Sai định dạng Email
    test('UTC-02: Should return 400 if email format is invalid', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 100, quantity: 1 }],
            amount: 50000,
            address: { city: "HCM" },
            email: "abc"
        };

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Invalid email format"
        }));
    });

    // UTC-03: Validate: Số tiền dưới hạn mức (<10k)
    test('UTC-03: Should return 400 if amount is too low (<10000)', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 50, quantity: 1 }],
            amount: 1000,
            address: { city: "HCM" },
            email: "test@example.com"
        };

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Amount too low"
        }));
    });

    // UTC-04: Happy Path: Đặt hàng thành công
    test('UTC-04: Should return 200 and session URL on success', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 100, quantity: 2 }],
            amount: 50000,
            address: { city: "HCM" },
            email: "test@example.com"
        };

        mockSessionCreate.mockResolvedValue({ url: "http://stripe.com/session" });
        mockOrderSave.mockResolvedValue({ _id: "order123" });
        mockUserFindByIdAndUpdate.mockResolvedValue({});

        await placeOrder(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            session_url: "http://stripe.com/session"
        }));
        expect(mockOrderSave).toHaveBeenCalled();
        expect(mockSessionCreate).toHaveBeenCalled();
    });

    // UTC-05: Business Error: Thẻ bị từ chối
    test('UTC-05: Should handle card declined error from Stripe', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 100, quantity: 2 }],
            amount: 50000,
            address: { city: "HCM" },
            email: "test@example.com"
        };

        const stripeError = {
            code: 'card_declined',
            message: 'Thẻ bị từ chối'
        };
        mockSessionCreate.mockRejectedValue(stripeError);
        mockOrderSave.mockResolvedValue({ _id: "order123" });
        mockUserFindByIdAndUpdate.mockResolvedValue({});

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Thẻ bị từ chối"
        }));
    });

    // UTC-06: Business Error: Sai mã CVC
    test('UTC-06: Should handle incorrect CVC error from Stripe', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 100, quantity: 2 }],
            amount: 50000,
            address: { city: "HCM" },
            email: "test@example.com"
        };

        const stripeError = {
            code: 'incorrect_cvc',
            message: 'Sai mã CVC'
        };
        mockSessionCreate.mockRejectedValue(stripeError);

        mockOrderSave.mockResolvedValue({ _id: "order123" });
        mockUserFindByIdAndUpdate.mockResolvedValue({});

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(402);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Sai mã CVC"
        }));
    });

    // UTC-07: System Error: Lỗi kết nối Stripe (Network Error)
    test('UTC-07: Should return 500 on Stripe network error', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 100, quantity: 2 }],
            amount: 50000,
            address: { city: "HCM" },
            email: "test@example.com"
        };

        mockSessionCreate.mockRejectedValue(new Error("Network Error"));

        mockOrderSave.mockResolvedValue({ _id: "order123" });
        mockUserFindByIdAndUpdate.mockResolvedValue({});

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Lỗi hệ thống thanh toán"
        }));
    });

    // UTC-08: System Error: Lỗi lưu Database
    test('UTC-08: Should return 500 if DB save fails', async () => {
        req.body = {
            userId: "user123",
            items: [{ name: "Pizza", price: 100, quantity: 2 }],
            amount: 50000,
            address: { city: "HCM" },
            email: "test@example.com"
        };

        mockOrderSave.mockRejectedValue(new Error("DB Error"));

        await placeOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        // Matching the regex check logic or the default message
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringMatching(/Internal Server Error|Error/)
        }));
    });

    // UTC-09: Happy Path: Xác thực thành công
    test('UTC-09: Should verify order successfully', async () => {
        req.body = {
            success: "true",
            orderId: "valid_id"
        };

        mockOrderFindByIdAndUpdate.mockResolvedValue({});

        await verifyOrder(req, res);

        expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith("valid_id", { payment: true });
        expect(res.json).toHaveBeenCalledWith({ success: true, message: "Paid" });
    });

    // UTC-10: Business Logic: Thanh toán thất bại/Hủy
    test('UTC-10: Should handle failed payment verification', async () => {
        req.body = {
            success: "false",
            orderId: "valid_id"
        };

        mockOrderFindByIdAndDelete.mockResolvedValue({});

        await verifyOrder(req, res);

        expect(mockOrderFindByIdAndDelete).toHaveBeenCalledWith("valid_id");
        expect(res.json).toHaveBeenCalledWith({ success: false, message: "Not Paid" });
    });

    // UTC-11: System Error: Lỗi cập nhật DB
    test('UTC-11: Should return 500 on DB update error during verification', async () => {
        req.body = {
            success: "true",
            orderId: "valid_id"
        };

        mockOrderFindByIdAndUpdate.mockRejectedValue(new Error("Update Failed"));

        await verifyOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: "Update Failed"
        }));
    });

});
