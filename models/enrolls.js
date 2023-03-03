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
      "PAYMENT_PENDING", // after verification done from admin, then student will able to pay fees
      "IN_PRECESSING", // After payment file will gone to under_processing
      "CLOSED", // after all process, file will be closed
    ],
  },
});

// Compile model from schema
module.exports = EnrollModel = model("enroll", enrollSchema);
