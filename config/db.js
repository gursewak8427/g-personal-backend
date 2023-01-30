// Import the mongoose module
const mongoose = require("mongoose");
mongoose.set('strictQuery', true)
const connectDb = () => {
    // Set up default mongoose connection
    const mongoDB = process.env.DB_URL;
    mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true }).then(_ => console.log("Database Connected!")).catch(err => console.log(err));
}

module.exports = connectDb;