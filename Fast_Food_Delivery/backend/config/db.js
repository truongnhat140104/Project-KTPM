import mongoose from "mongoose";


export const connectDB = async () => {
    // the string which insert in connect function . we can get it in mongodb atlas cloud in 'network access' field.
    // delete '?' and insert name of project behind the '/'
    await mongoose.connect('mongodb+srv://elvis140104_db_user:1234566@cluster1.mnnl32w.mongodb.net/food-delivery').then(()=>{console.log("DB connect")})
}