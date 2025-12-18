import mongoose from "mongoose";


export const connectDB = async () => {
    const dbUri = process.env.MONGO_URI || 'mongodb+srv://elvis140104_db_user:1234566@cluster1.mnnl32w.mongodb.net/food-delivery';
    await mongoose.connect(dbUri).then(() => { console.log("DB connect") })
}