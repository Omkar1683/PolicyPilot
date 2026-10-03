const mongoose = require('mongoose');

let cachedPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is not defined.');
  }

  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      })
      .then((conn) => {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((err) => {
        cachedPromise = null;
        console.error(`❌ MongoDB connection error: ${err.message}`);
        throw new Error(
          'Could not connect to MongoDB Atlas. Please ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.'
        );
      });
  }

  return cachedPromise;
};

connectDB.default = connectDB;
module.exports = connectDB;
module.exports.default = connectDB;
