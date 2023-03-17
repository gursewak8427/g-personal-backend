const { ObjectId } = require("bson");
const { Schema, model } = require("mongoose");

const enrollSchema = new Schema({
  student_id: {
    type: ObjectId,
    ref: "student",
  },
  school_id: {
    type: ObjectId,
    ref: "school",
  },
  program_id: {
    type: String,
  },
  enroll_status: {
    type: String,
    enum: [
      "PENDING", // until documents are not completed
      "UNDER_VERIFICATION", // after documents are completed then admin/sub-admin will verify file finally
      "FEES_PENDING", // after verification done from admin, then student will able to pay fees
      "IN_PROCESSING", // After payment file will gone to under_processing
      "CLOSED", // after all process, file will be closed
    ],
  },
  fileId: {
    type: String,
    required: [true, "File ID is required"],
  },
  intake: {
    year: Number,
    month: Number
  },
  fees_status: {
    type: "String",
    enum: ["PENDING", "PAID", "FAILED"],
    default: "PENDING",
  },
  payment_id: String,
  payment_date_time: String,
  agentId: {
    type: ObjectId,
    ref: "agents",
    default: null,
  }
},
  { timestamps: true });

// Compile model from schema
module.exports = EnrollModel = model("enroll", enrollSchema);
