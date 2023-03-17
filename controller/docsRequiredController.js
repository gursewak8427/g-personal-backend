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

const addRequiredDocuments = async (req, res) => {
    const { userId } = req.userData
    const { countryName, documents } = req.body;

    var country = await DocsRequiredModel.findOne({ countryName: countryName.toLowerCase() })
    if (country) {
        res.json({
            status: "0",
            message: "Required Documents already added in this Country"
        })
        return;
    }

    var newCountry = new DocsRequiredModel({
        countryName: countryName.toLowerCase(),
        docsRequired: documents
    })

    await newCountry.save()

    res.json({
        status: "1",
        message: "Document Added Successfully",
    });
}

const updateRequiredDocuments = async (req, res) => {
    const { userId } = req.userData
    const { countryName, documents } = req.body;

    var country = await DocsRequiredModel.findOne({ countryName: countryName.toLowerCase() })
    if (!country) {
        res.json({
            status: "0",
            message: "Country Not Found"
        })
        return;
    }

    country.docsRequired = documents

    await country.save()

    res.json({
        status: "1",
        message: "Documents Updated Successfully",
    });
}

module.exports = { getDocsRequired, addRequiredDocuments, updateRequiredDocuments }