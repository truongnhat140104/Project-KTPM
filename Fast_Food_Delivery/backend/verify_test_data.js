
import mongoose from "mongoose";
import userModel from "./models/userModel.js";
import orderModel from "./models/orderModel.js";
import 'dotenv/config'

const connectDB = async () => {
    // Reusing the connection string from config/db.js but checking if we can just read it or use env
    // Inspecting file showed hardcoded string: 'mongodb+srv://elvis140104_db_user:1234566@cluster1.mnnl32w.mongodb.net/food-delivery'
    await mongoose.connect('mongodb+srv://elvis140104_db_user:1234566@cluster1.mnnl32w.mongodb.net/food-delivery');
    console.log("DB Connected for Verification");
}

const verify = async () => {
    await connectDB();
    
    const email = "testuser_unique_" + process.argv[2] + "@example.com"; // Pass unique ID
    const user = await userModel.findOne({ email: new RegExp("testuser_integration") }); 
    // Just find the latest created user or order
    
    console.log("\n--- VERIFICATION RESULTS ---");
    
    // Check User
    const latestUser = await userModel.findOne().sort({ _id: -1 });
    console.log("Latest User:", latestUser ? latestUser.email : "None");
    
    // Check Order
    const latestOrder = await orderModel.findOne().sort({ _id: -1 });
    console.log("Latest Order Amount:", latestOrder ? latestOrder.amount : "None");
    console.log("Latest Order Payment:", latestOrder ? latestOrder.payment : "None");

    process.exit(0);
}

verify();
