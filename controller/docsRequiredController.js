const DocsRequiredModel = require("../models/docsRequired")
const EmbacyDocsModel = require("../models/embacyDocsRequired")

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
    const { docType, countriesList, title, isRequired } = req.body;


    let model;
    if (docType == "EMB") {
        model = EmbacyDocsModel
    }
    if (docType == "OL") {
        model = DocsRequiredModel
    }

    for (let index = 0; index < countriesList.length; index++) {
        const myCountry = countriesList[index];
        var country = await model.findOne({ countryName: myCountry.toLowerCase() })
        if (!country) {
            var country = new model({
                countryName: myCountry.toLowerCase(),
                docsRequired: [{ title, isRequired: isRequired == "T" ? true : false }]
            })
        } else {
            country.docsRequired.push({ title, isRequired: isRequired == "T" ? true : false })
        }
    }

    await country.save()

    res.json({
        status: "1",
        message: "Document Added Successfully",
    });
}

const updateRequiredDocuments = async (req, res) => {
    const { countryName, documents } = req.body;

    var country = await DocsRequiredModel.findOne({ countryName: countryName.toLowerCase() })
    if (!country) {
        var newCountry = new DocsRequiredModel({
            countryName: countryName.toLowerCase(),
            docsRequired: documents
        })

        await newCountry.save()

        res.json({
            status: "1",
            message: "Document Added Successfully",
        });
        return;
    }

    country.docsRequired = documents

    await country.save()

    res.json({
        status: "1",
        message: "Documents Updated Successfully",
    });
}


const getEmbacyDocsRequired = async (req, res) => {
    const { countryName } = req.params
    const docs = await EmbacyDocsModel.findOne({ countryName: countryName.toLowerCase() })
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


const deleteDocs = async (req, res) => {
    try {
        const { documentIndex,
            countryName,
            type } = req.body;

        if (type == "OL") {
            var myModel = DocsRequiredModel;
        } else {
            var myModel = EmbacyDocsModel;
        }

        const country = await myModel.findOne({ countryName: countryName.toLowerCase() })
        if (!country) {
            res.json({
                status: "0",
                message: "Docs List Not Found, Country Id not exists"
            })
            return;
        }

        let oldDocs = country.docsRequired;
        oldDocs.splice(documentIndex, 1)
        country.docsRequired = oldDocs
        await country.save()

        res.json({
            status: "1",
            message: "Document Deleted Successfully",
        })
    } catch (error) {
        res.json({
            status: "0",
            message: "Something went wrong"
        })
    }

}

module.exports = { getDocsRequired, addRequiredDocuments, updateRequiredDocuments, getEmbacyDocsRequired, deleteDocs }