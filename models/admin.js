const { Schema, model } = require("mongoose");

const adminSchema = new Schema({
    email: {
        type: String,
        trim: true,
        required: true,
        description: "Email is required",
        trim: true,
        lowercase: true,
        unique: true,
        // minLength: 4,
        // maxLength: 15
    },
    password: {
        type: String,
        trim: true,
        required: true,
        description: "Password is required",
        trim: true,
        minLength: 6,
    },
    first_name: {
        type: String,
        trim: true,
    },
    last_name: {
        type: String,
        trim: true,
    },
});

// Compile model from schema
module.exports = AdminModel = model("admin", adminSchema);
