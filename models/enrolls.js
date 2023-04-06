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
  tution_fees_recepit: {
    type: String,
    default: ""
  },
  embassy_docs: {
    type: [{
      _id: false,
      document_title: String,
      document_url: String,
      document_status: {
        type: String,
        default: "UNDER_VERIFICATION",
        enum: ["APPROVED", "UN_APPROVED", "UNDER_VERIFICATION", "PENDING"]
      }
    }],
    default: []
  },
  enroll_status: {
    type: String,
    enum: [
      "FEES_AND_DOC_PENDING",
      "FEES_PENDING", // after verification done from admin, then student will able to pay fees
      "DOCUMENTS_PENDING", // 
      "UNDER_VERIFICATION", // after documents are completed then admin/sub-admin will verify file finally
      "DOCUMENTS_REJECT",
      "IN_PROCESSING", // OL Awaited
      "OL_RECEIVED", // OL Recieved and wait for tution fees
      "OL_REJECTED", // CLOSE
      "TUTION_FEES_PROCESSING", // S
      "TUTION_FEES_REJECTED", // 
      "FILE_LODGED", // wait for documents
      "FILE_LODGED_DOCS_PROCESSING", // 
      "FILE_LODGED_DOCS_REJECTED", // 
      "VISA_PROCESSING", // If docs approved then wait for visa
      "VISA_AWAITED", // If docs approved then wait for visa
      "VISA_APPROVED", // CLOSE
      "VISA_REJECTED", // CLOSE
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
