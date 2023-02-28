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
const { v4: uuidv4 } = require("uuid");
const Constants = require("./helper/constants")
const SchoolModel = require("./models/schools")
const SchoolNamesModel = require("./models/schoolNames")

// app.listen(3006, () => console.log("Server Start"))
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" } });

module.exports = { io };

io.on("connection", (socket) => {
    socket.emit("Connected", { socketId: socket.id })

    console.log("New client connected", socket.id);

    // socket.on("upload_csv_websocket", (data) => {
    //     try {
    //         //convert csvfile to jsonArray
    //         const fileName = data.file.filename
    //         csv()
    //             .fromFile(data.file.path)
    //             .then(async (jsonObj) => {
    //                 let addedSchools = []
    //                 let finalObj = []

    //                 socket.emit("FromAPI", { total: jsonObj.length })
    //                 for (var index = 0; index < jsonObj.length; index++) {
    //                     // skip row which havn't school name
    //                     // if (jsonObj[index]["school_name"] == "") continue;
    //                     if (addedSchools.includes(jsonObj[index]["school_name"])) {
    //                         let myindex = addedSchools.indexOf(jsonObj[index]["school_name"]);

    //                         var new_stream = jsonObj[index]["new_stream"].split(",").map(item => Constants.new_stream[item])
    //                         var program_level = jsonObj[index]["program_level"].split(",").map(item => Constants.program_level[item])

    //                         finalObj[myindex]["school_programs"].push({
    //                             "program_name": jsonObj[index]["program_name"],
    //                             "description": jsonObj[index]["description"],
    //                             "duration": parseFloat(jsonObj[index]["duration"]) || 0,
    //                             "grade_score": parseFloat(jsonObj[index]["grade_score"]) || 0,
    //                             "overall_band": parseFloat(jsonObj[index]["overall_band"]) || 0,
    //                             "pte_score": parseFloat(jsonObj[index]["pte_score"]) || 0,
    //                             "tofel_point": parseFloat(jsonObj[index]["tofel_point"]) || null,
    //                             "ielts_listening": parseFloat(jsonObj[index]["ielts_listening"]) || 0,
    //                             "ielts_speaking": parseFloat(jsonObj[index]["ielts_speaking"]) || 0,
    //                             "ielts_writting": parseFloat(jsonObj[index]["ielts_writting"]) || 0,
    //                             "ielts_reading": parseFloat(jsonObj[index]["ielts_reading"]) || 0,
    //                             "new_stream": new_stream,
    //                             "stream_id": parseFloat(jsonObj[index]["stream_id"]) || 0,
    //                             "application_fee": parseFloat(jsonObj[index]["application_fee"]) || 0,
    //                             "tution_fee_per_semester": parseFloat(jsonObj[index]["tution_fee_per_semester"].split(",").join("")) || 0,
    //                             "acceptance_letter": parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
    //                             "intake_id": jsonObj[index]["intake_id"],
    //                             "visa_processing_days": parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
    //                             "process_days": parseFloat(jsonObj[index]["process_days"]) || 0,
    //                             "program_level": program_level,
    //                             "other_comment": jsonObj[index]["other_comment"],
    //                             "foundation_fee": parseFloat(jsonObj[index]["Foundation Fee"]) || 0,
    //                             "module": parseFloat(jsonObj[index]["module"]) || 0,
    //                             "english_language": parseFloat(jsonObj[index]["english_language"]) || 0,
    //                             "program_sort_order": parseFloat(jsonObj[index]["program_sort_order"]) || 0,
    //                             "cost_of_living": parseFloat(jsonObj[index]["cost_of_living"]) || 0,
    //                             "currency": jsonObj[index]["currency"],
    //                             "acceptable_band": parseFloat(jsonObj[index]["acceptable_band"]) || 0,
    //                         })
    //                     } else {
    //                         addedSchools.push(jsonObj[index]["school_name"])
    //                         console.log("Im here")
    //                         var type = jsonObj[index]["type"].split(",").map(item => Constants.type[item])

    //                         finalObj.push(
    //                             {
    //                                 "school_name": jsonObj[index]["school_name"],
    //                                 "school_about": jsonObj[index]["school_about"],
    //                                 "school_location": jsonObj[index]["school_location"],
    //                                 "country": jsonObj[index]["country"],
    //                                 "type": type.join(" "),
    //                                 "school_order": jsonObj[index]["type"].split(",")[1],
    //                                 "total_student": parseFloat(jsonObj[index]["total_student"]) || 0,
    //                                 "international_student": parseFloat(jsonObj[index]["international_student"]) || 0,
    //                                 "accomodation_feature": Boolean(jsonObj[index]["accomodation_feature"]),
    //                                 "work_permit_feature": Boolean(jsonObj[index]["work_permit_feature"]),
    //                                 "program_cooporation": Boolean(jsonObj[index]["program_cooporation"]),
    //                                 "work_while_study": Boolean(jsonObj[index]["work_while_study"]),
    //                                 "condition_offer_letter": Boolean(jsonObj[index]["condition_offer_letter"]),
    //                                 "library": Boolean(jsonObj[index]["library"]),
    //                                 "founded": parseFloat(jsonObj[index]["founded"]) || 0,
    //                                 "school_programs": [],
    //                             }
    //                         )
    //                     }
    //                 }

    //                 // console.log(finalObj);
    //                 // let newSchools = await SchoolModel.insertMany(finalObj)
    //                 socket.emit("FromAPI", { msg: "Final Object Created Successfully", data: finalObj })

    //                 var finalData = []
    //                 var resultData = []
    //                 var updated = false;
    //                 for (var i = 0; i < finalObj.length; i++) {
    //                     // add only school
    //                     var singleSchool = finalObj[i]

    //                     // find alerady school 
    //                     var newSchool = await SchoolModel.findOne({ school_name: singleSchool.school_name })
    //                     if (!newSchool) {
    //                         newSchool = await SchoolModel(singleSchool)
    //                         updated = false;
    //                     } else {
    //                         newSchool.school_name = singleSchool.school_name
    //                         newSchool.school_about = singleSchool.school_about
    //                         newSchool.school_location = singleSchool.school_location
    //                         newSchool.country = singleSchool.country
    //                         newSchool.type = singleSchool.type
    //                         newSchool.school_order = singleSchool.school_order
    //                         newSchool.total_student = singleSchool.total_student
    //                         newSchool.international_student = singleSchool.international_student
    //                         newSchool.accomodation_feature = singleSchool.accomodation_feature
    //                         newSchool.work_permit_feature = singleSchool.work_permit_feature
    //                         newSchool.program_cooporation = singleSchool.program_cooporation
    //                         newSchool.work_while_study = singleSchool.work_while_study
    //                         newSchool.condition_offer_letter = singleSchool.condition_offer_letter
    //                         newSchool.library = singleSchool.library
    //                         newSchool.founded = singleSchool.founded
    //                         newSchool.school_programs = singleSchool.school_programs
    //                         updated = true;
    //                     }
    //                     console.log("added", i)

    //                     newSchool.school_programs = []
    //                     try {
    //                         await newSchool.save();
    //                         if (updated) {
    //                             resultData.push("Updated")
    //                         } else {
    //                             resultData.push("Uploaded")
    //                         }
    //                         socket.emit("FromAPI", `Uplaoded`)
    //                     } catch (error) {
    //                         socket.emit("FromAPI", `Failed`)
    //                         if (error.name === "ValidationError") {

    //                             let errorsData = {};
    //                             Object.keys(error.errors).forEach((key) => {
    //                                 errorsData[key] = error.errors[key].message;
    //                             });

    //                             console.log({ "error1": errorsData })
    //                             resultData.push("Failed")
    //                             // console.log(singleSchool)
    //                             singleSchool.school_programs.map((_, index) => {
    //                                 console.log(index)
    //                                 socket.emit("FromAPI", `--`)
    //                                 resultData.push("--")
    //                             })
    //                             continue;
    //                         }
    //                     }
    //                     for (var j = 0; j < singleSchool.school_programs.length; j++) {
    //                         // console.log("j", j)
    //                         // if (i == 0 && j == 0) {
    //                         //     singleSchool.school_programs[j].program_name = ""
    //                         // }
    //                         try {
    //                             newSchool.school_programs.push(singleSchool.school_programs[j])
    //                             // if (i == 0 && j == 0) {
    //                             //     console.log({ newSchool })
    //                             // }
    //                             await newSchool.save();
    //                             if (updated) {
    //                                 resultData.push("Updated")
    //                             } else {
    //                                 resultData.push("Uploaded")
    //                             }
    //                             socket.emit("FromAPI", `Uplaoded`)
    //                             // console.log(`added ${i} => ${j}`)
    //                         } catch (error) {
    //                             socket.emit("FromAPI", `Failed`)
    //                             if (error.name === "ValidationError") {
    //                                 newSchool.school_programs.pop()
    //                                 let errorsData = {};
    //                                 Object.keys(error.errors).forEach((key) => {
    //                                     errorsData[key] = error.errors[key].message;
    //                                 });

    //                                 console.log({ "error2": errorsData })
    //                                 resultData.push("Failed")
    //                             }
    //                         }

    //                     }

    //                     finalData.push(newSchool)
    //                 }

    //                 fs.unlink("uploads/" + fileName, (err) => {
    //                     if (err) {
    //                         console.log("File Deleted Failed.");
    //                     }

    //                 });

    //                 socket.emit("FromAPI", {
    //                     message: "Data Uploaded Successfully",
    //                     details: {
    //                         schools: finalData,
    //                         results: resultData,
    //                     }
    //                 })
    //             });
    //     } catch (error) {
    //         console.log(error)
    //         socket.emit("FromAPI", {
    //             message: "Data Not Uploaded"
    //         })
    //     }
    // })

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
                        // skip row which havn't school name and program_name is empty
                        if (jsonObj[index]["school_name"] == "" && jsonObj[index]["program_name"] == "") continue;

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

                        if (myErrors.length != 0) {
                            console.log(myErrors);
                            // erroredIndex.push(index)
                            erroredData.push(myErrors.join("\n"))
                        } else {
                            erroredData.push("NOT_ERROR")
                        }

                        if (addedSchools.includes(jsonObj[index]["school_name"])) {
                            // console.log({ json: jsonObj[index] });
                            let myindex = addedSchools.indexOf(jsonObj[index]["school_name"]);

                            var new_stream = jsonObj[index]["new_stream"].split(",").map(item => Constants.new_stream[parseInt(item)])
                            var program_level = jsonObj[index]["program_level"].split(",").map(item => Constants.program_level[parseInt(item)])



                            // get Current year
                            let year = new Date().getFullYear();  // 2023
                            let month = new Date().getMonth();  // 2

                            let tempIntakes = [{
                                year: year,
                                months: [false, false, false, false, false, false, false, false, false, false, false, false]
                            }, {
                                year: year + 1,
                                months: [false, false, false, false, false, false, false, false, false, false, false, false]
                            }]

                            let intakeNewData = jsonObj[index]["intake_id"].split(",").map(intake => {
                                if (parseInt(intake) >= month) {
                                    tempIntakes[0].months[parseInt(intake) - 1] = true
                                } else {
                                    tempIntakes[1].months[parseInt(intake) - 1] = true
                                }
                            })

                            finalObj[myindex]["school_programs"].push({
                                "program_id": uuidv4(),
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
                                "other_fees": parseFloat(jsonObj[index]["other_fees"]) || 0,
                                "application_fee": parseFloat(jsonObj[index]["application_fee"]) || 0,
                                "min_tution_fee_per_semester": parseFloat(jsonObj[index]["min_tution_fee_per_semester"].split(",").join("")) || 0,
                                "max_tution_fee": parseFloat(jsonObj[index]["max_tution_fee"].split(",").join("")) || 0,
                                "cost_of_living": parseFloat(jsonObj[index]["cost_of_living"]) || 0,
                                "currency": jsonObj[index]["currency"],
                                "acceptance_letter": parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
                                // "intake_id": jsonObj[index]["intake_id"],
                                "visa_processing_days": parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
                                "process_days": parseFloat(jsonObj[index]["process_days"]) || 0,
                                "credentials": jsonObj[index]["credentials"] || "",
                                "program_level": program_level,
                                "other_comment": jsonObj[index]["other_comment"],
                                "foundation_fee": parseFloat(jsonObj[index]["foundation_fee"]) || 0,
                                "acceptable_band": parseFloat(jsonObj[index]["acceptable_band"]) || 0,
                                "module": parseFloat(jsonObj[index]["module"]) || 0,
                                "english_language": parseFloat(jsonObj[index]["english_language"]) || 0,
                                "program_sort_order": parseFloat(jsonObj[index]["program_sort_order"]) || 0,
                                "intakes_data": tempIntakes,
                            })
                        } else {
                            addedSchools.push(jsonObj[index]["school_name"])
                            var type = jsonObj[index]["type"].split(",").map(item => Constants.type[item])
                            var new_stream = jsonObj[index]["new_stream"].split(",").map(item => Constants.new_stream[parseInt(item)])
                            var program_level = jsonObj[index]["program_level"].split(",").map(item => Constants.program_level[parseInt(item)])

                            // get school detail 
                            var schoolDtl = await SchoolNamesModel.
                                aggregate([
                                    {
                                        $match: {
                                            schoolName: jsonObj[index]["school_name"].toLowerCase(),
                                        }
                                    },
                                    {
                                        $lookup: {
                                            "from": "countries",
                                            "localField": "country",
                                            "foreignField": "countryId",
                                            "as": "countryDetails"
                                        }
                                    },
                                    {
                                        $lookup: {
                                            "from": "cities",
                                            "localField": "city",
                                            "foreignField": "cityId",
                                            "as": "cityDetails"
                                        }
                                    },
                                    {
                                        $lookup: {
                                            "from": "states",
                                            "localField": "state",
                                            "foreignField": "stateId",
                                            "as": "stateDetails"
                                        }
                                    },
                                ])
                            console.log({ schoolDtl })
                            if (schoolDtl) {
                                var country = schoolDtl[0].countryDetails[0].countryName
                                var state = schoolDtl[0].stateDetails[0].stateName
                                var city = schoolDtl[0].cityDetails[0].cityName
                            } else {
                                console.log("School not found")
                            }

                            // get Current year
                            let year = new Date().getFullYear();  // 2023
                            let month = new Date().getMonth();  // 2

                            let tempIntakes = [{
                                year: year,
                                months: [false, false, false, false, false, false, false, false, false, false, false, false]
                            }, {
                                year: year + 1,
                                months: [false, false, false, false, false, false, false, false, false, false, false, false]
                            }]


                            let intakeNewData = jsonObj[index]["intake_id"].split(",").map(intake => {
                                if (parseInt(intake) >= month) {
                                    tempIntakes[0].months[parseInt(intake) - 1] = true
                                } else {
                                    tempIntakes[1].months[parseInt(intake) - 1] = true
                                }
                            })

                            finalObj.push(
                                {
                                    "school_name": jsonObj[index]["school_name"].toLowerCase(),
                                    "school_about": jsonObj[index]["school_about"],
                                    "school_location": jsonObj[index]["school_location"],
                                    "country": country,
                                    "state": state,
                                    "city": city,
                                    "type": type.join(" "),
                                    // "school_order": jsonObj[index]["type"].split(",")[1],
                                    "total_student": parseFloat(jsonObj[index]["total_student"]) || 0,
                                    "international_student": parseFloat(jsonObj[index]["international_student"]) || 0,
                                    "accomodation_feature": Boolean(jsonObj[index]["accomodation_feature"]),
                                    "work_permit_feature": Boolean(jsonObj[index]["work_permit_feature"]),
                                    "program_cooporation": Boolean(jsonObj[index]["program_cooporation"]),
                                    "work_while_study": Boolean(jsonObj[index]["work_while_study"]),
                                    "condition_offer_letter": Boolean(jsonObj[index]["condition_offer_letter"]),
                                    "library": Boolean(jsonObj[index]["library"]),
                                    "founded": parseFloat(jsonObj[index]["founded"]) || 0,
                                    "school_programs": [{
                                        "program_id": uuidv4(),
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
                                        "other_fees": parseFloat(jsonObj[index]["other_fees"]) || 0,
                                        "application_fee": parseFloat(jsonObj[index]["application_fee"]) || 0,
                                        "min_tution_fee_per_semester": parseFloat(jsonObj[index]["min_tution_fee_per_semester"].split(",").join("")) || 0,
                                        "max_tution_fee": parseFloat(jsonObj[index]["max_tution_fee"].split(",").join("")) || 0,
                                        "cost_of_living": parseFloat(jsonObj[index]["cost_of_living"]) || 0,
                                        "currency": jsonObj[index]["currency"],
                                        "acceptance_letter": parseFloat(jsonObj[index]["acceptance_letter"]) || 0,
                                        // "intake_id": jsonObj[index]["intake_id"],
                                        "visa_processing_days": parseFloat(jsonObj[index]["visa_processing_days"]) || 0,
                                        "process_days": parseFloat(jsonObj[index]["process_days"]) || 0,
                                        "credentials": jsonObj[index]["credentials"] || "",
                                        "program_level": program_level,
                                        "other_comment": jsonObj[index]["other_comment"],
                                        "foundation_fee": parseFloat(jsonObj[index]["foundation_fee"]) || 0,
                                        "acceptable_band": parseFloat(jsonObj[index]["acceptable_band"]) || 0,
                                        "module": parseFloat(jsonObj[index]["module"]) || 0,
                                        "english_language": parseFloat(jsonObj[index]["english_language"]) || 0,
                                        "program_sort_order": parseFloat(jsonObj[index]["program_sort_order"]) || 0,
                                        "intakes_data": tempIntakes,
                                    }],
                                }
                            )
                        }

                        // socket.emit("FromAPI", { message: "Uploaded", index: index })
                    }

                    // console.log(finalObj);
                    // let newSchools = await SchoolModel.insertMany(finalObj)
                    var updated = false;
                    var myCustomIndex = 0;
                    for (let index = 0; index < finalObj.length; index++) {
                        const singleSchool = finalObj[index];
                        // console.log("length", singleSchool.school_programs.length)
                        var newSchool = await SchoolModel.findOne({ school_name: singleSchool.school_name })
                        if (!newSchool) {
                            newSchool = await SchoolModel(singleSchool)
                            // console.log({ newSchool })
                            updated = false;
                            // if (erroredData[myCustomIndex] != "NOT_ERROR") {
                            //     socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                            // } else {
                            //     socket.emit("FromAPI", { message: "Uploaded", index: myCustomIndex++ })
                            // }
                            for (var j = 0; j < singleSchool.school_programs.length; j++) {
                                if (updated) {
                                    if (erroredData[myCustomIndex] != "NOT_ERROR") {
                                        socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                                    } else
                                        socket.emit("FromAPI", { message: "Updated", index: myCustomIndex++ })
                                } else {
                                    if (erroredData[myCustomIndex] != "NOT_ERROR") {
                                        socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                                    } else
                                        socket.emit("FromAPI", { message: "Uploaded", index: myCustomIndex++ })
                                }
                            }
                        } else {
                            newSchool.school_name = singleSchool.school_name
                            newSchool.school_about = singleSchool.school_about
                            newSchool.school_location = singleSchool.school_location
                            newSchool.country = singleSchool.country
                            newSchool.state = singleSchool.state
                            newSchool.city = singleSchool.city
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
                            newSchool.school_programs = []
                            updated = true;

                            // if (erroredData[myCustomIndex] != "NOT_ERROR") socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                            // else socket.emit("FromAPI", { message: "Updated", index: myCustomIndex++ })

                            for (var j = 0; j < singleSchool.school_programs.length; j++) {
                                newSchool.school_programs.push(singleSchool.school_programs[j])
                                if (updated) {
                                    if (erroredData[myCustomIndex] != "NOT_ERROR") {
                                        socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                                    } else
                                        socket.emit("FromAPI", { message: "Updated", index: myCustomIndex++ })
                                } else {
                                    if (erroredData[myCustomIndex] != "NOT_ERROR") {
                                        socket.emit("FromAPI", { message: "Failed", details: erroredData[myCustomIndex], index: myCustomIndex++ })
                                    } else
                                        socket.emit("FromAPI", { message: "Uploaded", index: myCustomIndex++ })
                                }
                            }
                        }

                        try {
                            await newSchool.save();
                        } catch (error) {
                            console.log({ error });
                        }
                    }


                    socket.emit("FromAPI", { msg: "All data Uploaded Successfully", data: newSchool })

                    fs.unlink("uploads/" + fileName, (err) => {
                        if (err) {
                            console.log("File Deleted Failed.");
                        }

                    });

                    socket.emit("FromAPI", {
                        message: "Data Uploaded Successfully",
                        details: {
                            schools: newSchool,
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
app.use(cors({
    origin: '*',
}))
app.use('/uploads/agent', express.static('uploads/agent'));
app.use('/uploads/student', express.static('uploads/student'));

// routes
app.use("/admin", require("./routes/admin"))
app.use("/agent", require("./routes/agent"))
app.use("/student", require("./routes/student"))
app.use("/notification", require("./routes/notification"))
app.use("/address", require("./routes/address"))


server.listen(process.env.PORT || 3006, () => console.log(`Listening on port ${process.env.PORT || 3006}`));

