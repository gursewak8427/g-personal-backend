const { Schema, model } = require("mongoose");

const studentSchema = new Schema({
    email: {
        type: String,
        trim: true,
        trim: true,
        lowercase: true,
        required: [true, 'Email is required'],
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        trim: true,
        required: [true, 'Password is required'],
        minlength: [6, "Password must have minimum 6 characters"],
    },
    firstName: {
        type: String,
        trim: true,
        required: [true, 'First Name is required'],
    },
    lastName: {
        type: String,
        trim: true,
        required: [true, 'Last Name is required'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        minlength: [10, "Phone number is invalid"],
    },
    agent_id: {
        type: String,
        default: "",
    },
    emailVerified: {
        type: String,
        default: "UN_VERIFIED",
        enum: ["UN_VERIFIED", "VERIFIED"]
    }
});

// Compile model from schema
module.exports = StudentModel = model("student", studentSchema);
