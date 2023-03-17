const { Schema, model } = require("mongoose");

const historySchema = new Schema({
    fileId: {
        type: String,
    },
    userId: {
        type: String,
    },
    userRole: {
        type: String,
        enum: [
            "ADMIN", "EMPLOYEE", "AGENT", "STUDENT"
        ],
        required: [true, "User role are required"]
    },
    content: {
        type: String,
    },

}, {
    timestamps: true
});

// Compile model from schema
module.exports = HistoryModel = model("histories", historySchema);
