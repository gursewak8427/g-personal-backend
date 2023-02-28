const { ObjectId } = require("bson");
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
        // required: [true, 'Password is required'],
        // minlength: [6, "Password must have minimum 6 characters"],
    },
    firstName: {
        type: String,
        trim: true,
        // required: [true, 'First Name is required'],
    },
    lastName: {
        type: String,
        trim: true,
        // required: [true, 'Last Name is required'],
    },
    phone: {
        type: String,
        // required: [true, 'Phone number is required'],
        // minlength: [10, "Phone number is invalid"],
    },
    agent_id: {
        type: String,
        default: "",
    },
    emailVerified: {
        type: String,
        default: "UN_VERIFIED",
        enum: ["UN_VERIFIED", "VERIFIED"]
    },
    loginProvider: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        default: "PENDING",
        enum: ["PENDING", "IN_PROCESS", "APPROVED", "REJECTED"]
    },
    documents: [{
        document_title: String,
        document_url: String,
        document_status: {
            type: String,
            default: "PENDING",
            enum: ["APPROVED", "UN_APPROVED", "PENDING"]
        },
    }],
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
    device_token: {
        type: String,
        default: "",
    },
    remarks: [{
        text: {
            type: String,
            default: ""
        },
        created: {
            type: Date,
            default: Date.now()
        },
        user_details: Object,
    }],
    history: [{
        text: {
            type: String,
            default: ""
        },
        created: {
            type: Date,
            default: Date.now()
        },
        action_created_by_user_id: {
            type: String, // ["users", "admins"]
            default: ""
        },
        action_created_by_user_role: {
            type: String,
            enum: ["ADMIN", "EMPLOYEE", "AGENT", "STUDENT"],
            required: [true, "User role are required"]
        }
    }]
},
    { timestamps: true });

// Compile model from schema
module.exports = StudentModel = model("student", studentSchema);
