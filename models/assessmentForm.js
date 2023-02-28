const { Schema, model } = require("mongoose");

const assessmentForm = new Schema({
    first_name: {
        type: String,
        trim: true,
    },
    last_name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        description: "Password is required",
    },
    phone: {
        type: String,
        trim: true,
    },
    destination_country: {
        type: String,
    },
    aggree_to_privacy_policy: {
        type: Boolean,
    },
    created: {
        type: String
    },
    status: {
        type : String,
        enum: ["PENDING", "VISITED", "ACTION"],
        default: "PENDING"
    }
}, {
    timestamps: true,
});

// Compile model from schema
module.exports = AssessmentForm = model("assessmentform", assessmentForm);
