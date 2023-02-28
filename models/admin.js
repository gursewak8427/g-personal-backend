const { Schema, model } = require("mongoose");

const adminSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        description: "Password is required",
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
    phone: {
        type: String,
        trim: true,
    },
    verificationCode: {
        code: String,
        token: String,
    },
    role: {
        type: String,
        enum: ["ADMIN", "SUBADMIN", "COUNSELOR"],
        default: "ADMIN"
    },
    created: {
        type: String
    },
    permissions: [String],
    notifications: [{
        message: String,
        redirectUrl: String,
        body: String,
        created: String,
    }],
    unseenNotifications: {
        type: Number,
        default: 0,
    },
    web_push_token: {
        type: String,
        default: "",
    },
});

// Compile model from schema
module.exports = AdminModel = model("admin", adminSchema);
