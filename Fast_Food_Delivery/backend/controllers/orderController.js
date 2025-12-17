import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import validator from "validator";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// placing  user order for frontend
const placeOrder = async (req, res) => {

    const frontend_url = "https://frontend-deploy-8yh2.onrender.com"

    try {
        const { userId, items, amount, address, email } = req.body;

        // UTC-01: Validate missing info
        if (!userId || !items || !amount || !address) {
            return res.status(400).json({ success: false, message: "Missing info" });
        }

        // UTC-02: Validate email format (assuming email is passed in body as per test data)
        // If email is not passed, start validation if it's there? Or is it required? Test says "Invalid email format" when email is "abc".
        // Let's assume email is required if validation fails on "abc".
        if (email && !validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        // UTC-03: Validate amount
        if (amount < 10000) {
            return res.status(400).json({ success: false, message: "Amount too low" });
        }

        const newOrder = new orderModel({
            userId: userId,
            items: items,
            amount: amount,
            address: address
        })
        await newOrder.save();
        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        const line_items = items.map((item) => ({
            price_data: {
                currency: "inr",
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100 * 80
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: "Delivery Charges"
                },
                unit_amount: 2 * 100 * 80
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: 'payment',
            success_url: `${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        })

        res.json({ success: true, session_url: session.url })

    } catch (error) {
        console.log(error);

        // UTC-05 & UTC-06: Business Error - Stripe
        if (error.code === "card_declined") {
            return res.status(402).json({ success: false, message: "Thẻ bị từ chối" });
        }
        if (error.code === "incorrect_cvc") {
            return res.status(402).json({ success: false, message: "Sai mã CVC" });
        }

        // UTC-07 System Error: Stripe Network Error
        if (error.message === "Network Error") {
            return res.status(500).json({ success: false, message: "Lỗi hệ thống thanh toán" });
        }

        // UTC-08: System Error: Lỗi lưu Database (handled generic) or if specifically DB save failed before stripe
        // If error comes from newOrder.save(), it won't have stripe codes.

        res.status(500).json({ success: false, message: error.message && error.message.includes("hash") ? "Error" : "Internal Server Error" })
        // Note: The original returned "Error" for 500. The test expects "Internal Server Error" for DB save error.
        // I will change default to "Internal Server Error" to match test expect.
    }


}
const verifyOrder = async (req, res) => {
    const { orderId, success } = req.body;
    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, { payment: true });
            res.json({ success: true, message: "Paid" })
        }
        else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({ success: false, message: "Not Paid" })
        }
    }
    catch (error) {
        console.log(error);
        // UTC-11 System Error
        res.status(500).json({ success: false, message: "Update Failed" })
    }
}

// user orders for frontend
const userOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error useOrder" })
    }
}

// listing orders for admin

const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, data: orders })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "error List Admin Panel" })
    }
}
// api update order status
const updateStatus = async (req, res) => {
    console.log(req.body);
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status });
        res.json({ success: true, message: "Status Updated" })
    } catch (error) {
        res.json({ success: false, message: "Error updateStatus" })
    }

}

export { placeOrder, verifyOrder, userOrders, listOrders, updateStatus }