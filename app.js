const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require('multer');
require('dotenv').config();
const app = express();
const connectDb = require("./config/db.js")
connectDb();
const fs = require('fs');
const csv = require("csvtojson");
// New for Socket.io
const http = require("http");
const Constants = require("./helper/constants")
const SchoolModel = require("./models/schools")

// app.listen(3006, () => console.log("Server Start"))
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

module.exports = { io };
io.on("connection", (socket) => {
    socket.emit("Connected", { socketId: socket.id })

    console.log("New client connected", socket.id);

    socket.on("upload_csv_websocket", (data) => {
        try {
            //convert csvfile to jsonArray
            const fileName = data.file.filename
            csv()
                .fromFile(data.file.path)
                .then(async (jsonObj) => {
                    let addedSchools = []
                    let finalObj = []

                    socket.emit("FromAPI", { total: jsonObj.length })
                    for (var index = 0; index < jsonObj.length; index++) {
                        // skip row which havn't school name
                        // if (jsonObj[index]["school_name"] == "") continue;
                        if (addedSchools.includes(jsonObj[index]["school_name"])) {
                            let myindex = addedSchools.indexOf(jsonObj[index]["school_name"]);

                            var new_stream = jsonObj[index]["new_stream"].split(",").map(item => Constants.new_stream[item])
                            var program_level = jsonObj[index]["program_level"].split(",").map(item => Constants.program_level[item])

                            finalObj[myindex]["school_programs"].push({
                                "program_name": jsonObj[index]["program_name"],
                                "description": jsonObj[index]["description"],
                                "duration": parseFloat(jsonObj[index]["duration"]) || 0,
                                "grade_score": parseFloat(jsonObj[index]["grade_score"]) || 0,
                                "overall_band": parseFloat(jsonObj[index]["overall_band"]) || 0,
                                "pte_score": parseFloat(jsonObj[index]["pte_score"]) || 0,
                                "tofel_point": parseFloat(jsonObj[index]["tofel_point"]) || null,
                                "ielts_listening": parseFloat(jsonObj[index]["ielts_listening"]) || 0,
                                "ielts_speaking": parseFloat(jsonObj[index]["ielts_speaking"]) || 0,
                                "ielts_writting": parseFloat(jsonObj[index]["ielts_writting"]) || 0,
                                "ielts_reading": parseFloat(jsonObj[index]["ielts_reading"]) || 0,
                                "new_stream": new_stream,
                                "stream_id": parseFloat(jsonObj[index]["stream_id"]) || 0,
                                "application_fee": parseFloat(jsonObj[index]["application_fee"]) || 0,
                                "tution_fee_per_semester": parseFloat(jsonObj[index]["tution_fee_per_semester"]) || 0,
                                "acceptance_letter": parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
                                "intake_id": jsonObj[index]["intake_id"],
                                "visa_processing_days": parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
                                "process_days": parseFloat(jsonObj[index]["process_days"]) || 0,
                                "program_level": program_level,
                                "other_comment": jsonObj[index]["Others Comment"],
                                "foundation_fee": parseFloat(jsonObj[index]["Foundation Fee"]) || 0,
                                "module": parseFloat(jsonObj[index]["module"]) || 0,
                                "english_language": parseFloat(jsonObj[index]["english_language"]) || 0,
                                "program_sort_order": parseFloat(jsonObj[index]["program_sort_order"]) || 0,
                                "cost_of_living": parseFloat(jsonObj[index]["cost_of_living"]) || 0,
                                "currency": jsonObj[index]["currency"],
                                "acceptable_band": parseFloat(jsonObj[index]["acceptable_band"]) || 0,
                            })
                        } else {
                            addedSchools.push(jsonObj[index]["school_name"])
                            console.log("Im here")
                            var type = jsonObj[index]["type"].split(",").map(item => Constants.type[item])

                            finalObj.push(
                                {
                                    "school_name": jsonObj[index]["school_name"],
                                    "school_about": jsonObj[index]["school_about"],
                                    "school_location": jsonObj[index]["school_location"],
                                    "country": jsonObj[index]["country"],
                                    "type": type.join(" "),
                                    "school_order": jsonObj[index]["type"].split(",")[1],
                                    "total_student": parseFloat(jsonObj[index]["total_student"]) || 0,
                                    "international_student": parseFloat(jsonObj[index]["international_student"]) || 0,
                                    "accomodation_feature": Boolean(jsonObj[index]["accomodation_feature"]),
                                    "work_permit_feature": Boolean(jsonObj[index]["work_permit_feature"]),
                                    "program_cooporation": Boolean(jsonObj[index]["program_cooporation"]),
                                    "work_while_study": Boolean(jsonObj[index]["work_while_study"]),
                                    "condition_offer_letter": Boolean(jsonObj[index]["condition_offer_letter"]),
                                    "library": Boolean(jsonObj[index]["library"]),
                                    "founded": parseFloat(jsonObj[index]["founded"]) || 0,
                                    "school_programs": [],
                                }
                            )
                        }
                    }

                    // console.log(finalObj);
                    // let newSchools = await SchoolModel.insertMany(finalObj)
                    socket.emit("FromAPI", { msg: "Final Object Created Successfully", data: finalObj })

                    var finalData = []
                    var resultData = []
                    var updated = false;
                    for (var i = 0; i < finalObj.length; i++) {
                        // add only school
                        var singleSchool = finalObj[i]

                        // find alerady school 
                        var newSchool = await SchoolModel.findOne({ school_name: singleSchool.school_name })
                        if (!newSchool) {
                            newSchool = await SchoolModel(singleSchool)
                            updated = false;
                        } else {
                            newSchool.school_name = singleSchool.school_name
                            newSchool.school_about = singleSchool.school_about
                            newSchool.school_location = singleSchool.school_location
                            newSchool.country = singleSchool.country
                            newSchool.type = singleSchool.type
                            newSchool.school_order = singleSchool.school_order
                            newSchool.total_student = singleSchool.total_student
                            newSchool.international_student = singleSchool.international_student
                            newSchool.accomodation_feature = singleSchool.accomodation_feature
                            newSchool.work_permit_feature = singleSchool.work_permit_feature
                            newSchool.program_cooporation = singleSchool.program_cooporation
                            newSchool.work_while_study = singleSchool.work_while_study
                            newSchool.condition_offer_letter = singleSchool.condition_offer_letter
                            newSchool.library = singleSchool.library
                            newSchool.founded = singleSchool.founded
                            newSchool.school_programs = singleSchool.school_programs
                            updated = true;
                        }
                        console.log("added", i)

                        newSchool.school_programs = []
                        try {
                            await newSchool.save();
                            if (updated) {
                                resultData.push("Updated")
                            } else {
                                resultData.push("Uploaded")
                            }
                            socket.emit("FromAPI", `Uplaoded`)
                        } catch (error) {
                            socket.emit("FromAPI", `Failed`)
                            if (error.name === "ValidationError") {

                                let errorsData = {};
                                Object.keys(error.errors).forEach((key) => {
                                    errorsData[key] = error.errors[key].message;
                                });

                                console.log({ "error1": errorsData })
                                resultData.push("Failed")
                                // console.log(singleSchool)
                                singleSchool.school_programs.map((_, index) => {
                                    console.log(index)
                                    socket.emit("FromAPI", `--`)
                                    resultData.push("--")
                                })
                                continue;
                            }
                        }
                        for (var j = 0; j < singleSchool.school_programs.length; j++) {
                            // console.log("j", j)
                            // if (i == 0 && j == 0) {
                            //     singleSchool.school_programs[j].program_name = ""
                            // }
                            try {
                                newSchool.school_programs.push(singleSchool.school_programs[j])
                                // if (i == 0 && j == 0) {
                                //     console.log({ newSchool })
                                // }
                                await newSchool.save();
                                if (updated) {
                                    resultData.push("Updated")
                                } else {
                                    resultData.push("Uploaded")
                                }
                                socket.emit("FromAPI", `Uplaoded`)
                                // console.log(`added ${i} => ${j}`)
                            } catch (error) {
                                socket.emit("FromAPI", `Failed`)
                                if (error.name === "ValidationError") {
                                    newSchool.school_programs.pop()
                                    let errorsData = {};
                                    Object.keys(error.errors).forEach((key) => {
                                        errorsData[key] = error.errors[key].message;
                                    });

                                    console.log({ "error2": errorsData })
                                    resultData.push("Failed")
                                }
                            }

                        }

                        finalData.push(newSchool)
                    }

                    fs.unlink("uploads/" + fileName, (err) => {
                        if (err) {
                            console.log("File Deleted Failed.");
                        }

                    });

                    socket.emit("FromAPI", {
                        message: "Data Uploaded Successfully",
                        details: {
                            schools: finalData,
                            results: resultData,
                        }
                    })
                });
        } catch (error) {
            console.log(error)
            socket.emit("FromAPI", {
                message: "Data Not Uploaded"
            })
        }
    })

    socket.on("upload_csv_websocket_custom_validation", (data) => {
        try {
            //convert csvfile to jsonArray
            const fileName = data.file.filename
            csv()
                .fromFile(data.file.path)
                .then(async (jsonObj) => {
                    let addedSchools = []
                    let finalObj = []
                    var erroredIndex = []
                    var erroredData = []
                    socket.emit("FromAPI", { total: jsonObj.length })
                    for (var index = 0; index < jsonObj.length; index++) {
                        // skip row which havn't school name
                        // if (jsonObj[index]["school_name"] == "") continue;
                        var myErrors = []
                        if (jsonObj[index]["school_name"] == "") {
                            myErrors.push("School Name is required");
                        }
                        if (jsonObj[index]["school_about"] == "") {
                            myErrors.push("School About is required");
                        }
                        if (jsonObj[index]["program_name"] == "") {
                            myErrors.push("Program Name is required");
                        }
                        if (jsonObj[index]["description"] == "") {
                            myErrors.push("Program Description is required");
                        }

                        if (myErrors.length != 0) {
                            console.log(myErrors);
                            erroredIndex.push(index)
                            erroredData.push(myErrors.join("\n"))
                            continue;
                        }

                        if (addedSchools.includes(jsonObj[index]["school_name"])) {
                            let myindex = addedSchools.indexOf(jsonObj[index]["school_name"]);

                            var new_stream = jsonObj[index]["new_stream"].split(",").map(item => Constants.new_stream[item])
                            var program_level = jsonObj[index]["program_level"].split(",").map(item => Constants.program_level[item])

                            finalObj[myindex]["school_programs"].push({
                                "program_name": jsonObj[index]["program_name"],
                                "description": jsonObj[index]["description"],
                                "duration": parseFloat(jsonObj[index]["duration"]) || 0,
                                "grade_score": parseFloat(jsonObj[index]["grade_score"]) || 0,
                                "overall_band": parseFloat(jsonObj[index]["overall_band"]) || 0,
                                "pte_score": parseFloat(jsonObj[index]["pte_score"]) || 0,
                                "tofel_point": parseFloat(jsonObj[index]["tofel_point"]) || null,
                                "ielts_listening": parseFloat(jsonObj[index]["ielts_listening"]) || 0,
                                "ielts_speaking": parseFloat(jsonObj[index]["ielts_speaking"]) || 0,
                                "ielts_writting": parseFloat(jsonObj[index]["ielts_writting"]) || 0,
                                "ielts_reading": parseFloat(jsonObj[index]["ielts_reading"]) || 0,
                                "new_stream": new_stream,
                                "stream_id": parseFloat(jsonObj[index]["stream_id"]) || 0,
                                "application_fee": parseFloat(jsonObj[index]["application_fee"]) || 0,
                                "tution_fee_per_semester": parseFloat(jsonObj[index]["tution_fee_per_semester"]) || 0,
                                "acceptance_letter": parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
                                "intake_id": jsonObj[index]["intake_id"],
                                "visa_processing_days": parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
                                "process_days": parseFloat(jsonObj[index]["process_days"]) || 0,
                                "program_level": program_level,
                                "other_comment": jsonObj[index]["Others Comment"],
                                "foundation_fee": parseFloat(jsonObj[index]["Foundation Fee"]) || 0,
                                "module": parseFloat(jsonObj[index]["module"]) || 0,
                                "english_language": parseFloat(jsonObj[index]["english_language"]) || 0,
                                "program_sort_order": parseFloat(jsonObj[index]["program_sort_order"]) || 0,
                                "cost_of_living": parseFloat(jsonObj[index]["cost_of_living"]) || 0,
                                "currency": jsonObj[index]["currency"],
                                "acceptable_band": parseFloat(jsonObj[index]["acceptable_band"]) || 0,
                            })
                        } else {
                            addedSchools.push(jsonObj[index]["school_name"])
                            console.log("Im here")
                            var type = jsonObj[index]["type"].split(",").map(item => Constants.type[item])

                            finalObj.push(
                                {
                                    "school_name": jsonObj[index]["school_name"],
                                    "school_about": jsonObj[index]["school_about"],
                                    "school_location": jsonObj[index]["school_location"],
                                    "country": jsonObj[index]["country"],
                                    "type": type.join(" "),
                                    "school_order": jsonObj[index]["type"].split(",")[1],
                                    "total_student": parseFloat(jsonObj[index]["total_student"]) || 0,
                                    "international_student": parseFloat(jsonObj[index]["international_student"]) || 0,
                                    "accomodation_feature": Boolean(jsonObj[index]["accomodation_feature"]),
                                    "work_permit_feature": Boolean(jsonObj[index]["work_permit_feature"]),
                                    "program_cooporation": Boolean(jsonObj[index]["program_cooporation"]),
                                    "work_while_study": Boolean(jsonObj[index]["work_while_study"]),
                                    "condition_offer_letter": Boolean(jsonObj[index]["condition_offer_letter"]),
                                    "library": Boolean(jsonObj[index]["library"]),
                                    "founded": parseFloat(jsonObj[index]["founded"]) || 0,
                                    "school_programs": [],
                                }
                            )
                        }

                        // socket.emit("FromAPI", { message: "Uploaded", index: index })
                    }

                    socket.emit("FromAPI", { msg: "Final Object Created Successfully", data: finalObj })
                    // console.log(finalObj);
                    // let newSchools = await SchoolModel.insertMany(finalObj)
                    var updated = false;
                    var myCustomIndex = 0;
                    for (let index = 0; index < finalObj.length; index++) {
                        const singleSchool = finalObj[index];

                        var newSchool = await SchoolModel.findOne({ school_name: singleSchool.school_name })
                        if (!newSchool) {
                            newSchool = await SchoolModel(singleSchool)
                            updated = false;
                            while (erroredIndex.includes(myCustomIndex)) {
                                socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                            }
                            socket.emit("FromAPI", { message: "Uploaded", index: myCustomIndex++ })
                        } else {
                            newSchool.school_name = singleSchool.school_name
                            newSchool.school_about = singleSchool.school_about
                            newSchool.school_location = singleSchool.school_location
                            newSchool.country = singleSchool.country
                            newSchool.type = singleSchool.type
                            newSchool.school_order = singleSchool.school_order
                            newSchool.total_student = singleSchool.total_student
                            newSchool.international_student = singleSchool.international_student
                            newSchool.accomodation_feature = singleSchool.accomodation_feature
                            newSchool.work_permit_feature = singleSchool.work_permit_feature
                            newSchool.program_cooporation = singleSchool.program_cooporation
                            newSchool.work_while_study = singleSchool.work_while_study
                            newSchool.condition_offer_letter = singleSchool.condition_offer_letter
                            newSchool.library = singleSchool.library
                            newSchool.founded = singleSchool.founded
                            newSchool.school_programs = singleSchool.school_programs
                            updated = true;
                            while (erroredIndex.includes(myCustomIndex)) {
                                socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                            }
                            socket.emit("FromAPI", { message: "Updated", index: myCustomIndex++ })
                        }
                        for (var j = 0; j < singleSchool.school_programs.length; j++) {
                            newSchool.school_programs.push(singleSchool.school_programs[j])
                            if (updated) {
                                while (erroredIndex.includes(myCustomIndex)) {
                                    socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                                }
                                socket.emit("FromAPI", { message: "Updated", index: myCustomIndex++ })
                            } else {
                                while (erroredIndex.includes(myCustomIndex)) {
                                    socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                                }
                                socket.emit("FromAPI", { message: "Uploaded", index: myCustomIndex++ })
                            }
                        }
                        await newSchool.save();
                    }


                    socket.emit("FromAPI", { msg: "All data Uploaded Successfully", data: newSchools })

                    fs.unlink("uploads/" + fileName, (err) => {
                        if (err) {
                            console.log("File Deleted Failed.");
                        }

                    });

                    socket.emit("FromAPI", {
                        message: "Data Uploaded Successfully",
                        details: {
                            schools: newSchools,
                            // results: resultData,
                        }
                    })
                });
        } catch (error) {
            console.log(error)
            socket.emit("FromAPI", {
                message: "Data Not Uploaded"
            })
        }
    })

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});


// middlewares
app.use(express.json());
app.use(cors())
app.use('/uploads/agent', express.static('uploads/agent'));

// routes
app.use("/admin", require("./routes/admin"))
app.use("/agent", require("./routes/agent"))
app.use("/student", require("./routes/student"))


server.listen(process.env.PORT || 3006, () => console.log(`Listening on port ${process.env.PORT || 3006}`));
