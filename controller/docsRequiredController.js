const DocsRequiredModel = require("../models/docsRequired")

const getDocsRequired = async (req, res) => {
    const { countryName } = req.params
    const docs = await DocsRequiredModel.findOne({ countryName })
    if (!docs) {
        res.json({
            status: "0",
            message: "Docs List Not Found, Country Id not exists"
        })
        return;
    }
    res.json({
        status: "1",
        message: "Docs List Found",
        details: {
            docs
        }
    })
}
module.exports = { getDocsRequired }