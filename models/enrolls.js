const { ObjectId } = require("bson");
const { Schema, model } = require("mongoose");

const enrollSchema = new Schema({
    student_id: {
        type: ObjectId,
        ref: "student"
    },
    school_id: {
        type: ObjectId,
        ref: "school"
    },
    program_id: {
        type: String,
    },
    enroll_status: {
        type: String,
        enum: ["PENDING", "PROCESSING"]
    },
});

// Compile model from schema
module.exports = EnrollModel = model("enroll", enrollSchema);
