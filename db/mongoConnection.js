const mongoose = require('mongoose');
require('dotenv').config();

const mongoURI = process.env.MONGO_USER_URI; // Your MongoDB connection URI

async function connectMongoDB() {
    try {
        await mongoose.connect(mongoURI);
        console.log("MongoDB connected successfully");
        return mongoose; // Return Mongoose instance
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        throw error; // Rethrow error to handle in app.js
    }
}

module.exports = connectMongoDB;