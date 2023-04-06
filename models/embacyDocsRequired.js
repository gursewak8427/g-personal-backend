const { Schema, model } = require("mongoose");

const docsRequiredSchema = new Schema({
    countryName: {
        type: String,
    },
    docsRequired: {
        type: [{
            title: String,
            isRequired: {
                type: Boolean,
                default: true,
            },
        }],
    },
}, {
    timestamps: true
});

// Compile model from schema
module.exports = EmbacyDocsModel = model("embacydocsrequireds", docsRequiredSchema);
