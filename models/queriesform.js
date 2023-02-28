const { Schema, model } = require("mongoose");

const queriesFormSchmea = new Schema({
    nationality: {
        type: String,
        trim: true,
    },
    highesteducation: {
        type: String,
        trim: true,
    },
    grading_scheme: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        description: "Password is required",
    },
    grade_avg: {
        type: String,
        trim: true,
    },
    fullname: {
        type: String,
    },
    phone: {
        type: String,
    },
    email: {
        type: String
    },
    destination_country: {
        type : String,
    },
    examType: {
        type: String,
    },
    scores: {
        type: [String],
    },
    overall_score: {
        type: String,
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
module.exports = QueriesForm = model("queriesform", queriesFormSchmea);
