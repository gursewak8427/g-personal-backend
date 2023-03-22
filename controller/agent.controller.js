const AgentModel = require("../models/agent")
const AdminModel = require("../models/admin")
const StudentModel = require("../models/student")
const { sendEmail } = require("../helper/sendEmail")
const fs = require('fs');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const saltRounds = 10
var generatorPassword = require('generate-password');
const { default: axios } = require("axios");
const { sendConfirmationEmail } = require("../helper/sendConfirmationEmail");
const { ObjectId } = require("bson");


const appendNotification = async (
    model,
    users,
    msg,
    url,
    body = "",
    userId = null
) => {
    // send msg
    await model.updateMany(
        model == AdminModel
            ? {
                role: { $in: users },
            }
            : {},
        {
            $push: {
                notifications: {
                    message: msg,
                    redirectUrl: url,
                    body,
                    created: Date.now(),
                },
            },
            $inc: {
                unseenNotifications: 1,
            },
        }
    );

    // get admin token

    if (userId) {
        var user = await model.findOne({ _id: userId });
    } else {
        var user = await model.findOne();
    }

    try {
        let ENDPOINT = "https://learn-global-backend.onrender.com/notification"
        // let ENDPOINT = "http://localhost:3006/notification";

        console.log({ user });

        let token = [user.web_push_token];

        if (model == StudentModel) {
            token = [user.web_push_token, user.device_token];
        }

        console.log({ token });

        const response = await axios.post(ENDPOINT, {
            title: msg,
            body: body,
            token: token,
            redirectUrl: url,
        });

        console.log({ response });
    } catch (error) {
        console.log({ error1: error });
    }
};

const testNotification = async (req, res) => {
    let userId = req.body.userId;
    let msg = "Test Notification";
    let url = "https://learn-global.onrender.com/d/student";
    await appendNotification(StudentModel, [], msg, url, "", userId);
    res.json({ success: "1", message: "Test Notification Send" });
};

const appendHistory = async (model, userId, userRole, text) => {
    // get admin token
    try {
        let userData = await model.findById(userId);
        userData.history.push({
            text: text,
            created: Date.now(),
            action_created_by_user_id: userId,
            action_created_by_user_role: userRole,
        });
        await userData.save();

        return {
            status: "1",
            message: "History Added Successfully",
        };
    } catch (error) {
        console.log({ error });
        return {
            status: "0",
            message: "History added failed",
            details: {
                error: error,
            },
        };
    }
};


const agentLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        let agent = await AgentModel.findOne({ username })
        if (!agent) {
            res.json({
                status: "0",
                message: "Username is not exist",
                details: {
                    error: ""
                }
            })
        } else {
            bcrypt.compare(password, agent.password, function (err, result) {
                if (err) {
                    res.json({
                        status: "0",
                        message: "Server Error Occured",
                        details: {
                            error: err
                        }
                    })
                    return;
                }

                if (!result) {
                    res.json({
                        status: "0",
                        message: "Password is wrong",
                    })
                    return;
                }


                // generate jwt token
                let jwtSecretKey = process.env.JWT_SECRET_KEY;
                let data = {
                    time: Date(),
                    userId: agent._id,
                    email: agent.email,
                    role: "AGENT"
                }

                const token = jwt.sign(data, jwtSecretKey);

                if (agent.status != "VERIFIED") {
                    res.json({
                        status: "1",
                        message: "Login Successfully",
                        // message: agent.status == "UN_VERIFIED" ? "You are not verified by Admin" : agent.status == "BLOCKED" ? "You are blocked by Admin" : "",
                        details: { agent, token }
                    })
                    return;
                }

                res.json({
                    status: "1",
                    message: "Agent Login Successfully",
                    details: {
                        token: token,
                        agent: {
                            email: agent.email,
                            id: agent._id
                        }
                    }
                })

            });
        }


    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

// New API
const agentRegister = async (req, res) => {
    try {
        const {
            email,
            first_name,
            last_name,
            street,
            city,
            state,
            country,
            postalcode,
            phone,
        } = req.body;
        let admin = await AgentModel.findOne({ email });
        if (admin) {
            res.json({
                status: "0",
                message: "Email Id is already exists",
                details: {
                    error: "This email is already used by another Agent",
                },
            });
        } else {
            var plainPassword = generatorPassword.generate({
                length: 6,
                numbers: true
            });

            bcrypt.hash(plainPassword, saltRounds, async function (err, hash) {
                // Store hash in your password DB.
                if (err) {
                    res.json({
                        status: 0,
                        message: "Server error occured",
                        details: {
                            error: err,
                        },
                    });
                    return;
                }

                if (!hash) {
                    res.json({
                        status: "0",
                        message: "Password is wrong",
                    });
                    return;
                }
                let username = email.split("@")[0]
                let agent = new AgentModel({
                    email: email,
                    username: username,
                    password: hash,
                    first_name: first_name,
                    last_name: last_name,
                    street: street,
                    city: city,
                    state: state,
                    country: country,
                    postal_code: postalcode,
                    phone: phone,
                });
                try {
                    await agent.save();
                } catch (error) {
                    if (error.name === "ValidationError") {
                        let errorsData = {};
                        Object.keys(error.errors).forEach((key) => {
                            errorsData[key] = error.errors[key].message;
                        });

                        res.json({
                            status: "0",
                            name: "ValidationError",
                            message: "Validation Error",
                            details: { error: errorsData }
                        })
                        return;

                    }

                    console.log(error)
                    return;
                }

                // send password to email now
                let subject = "Learn Global || Registration successful as Agent"
                let html = `<h1>Login Information</h1>
                    <h2>Hello, ${agent.first_name}</h2>
                    <p>Thank you for registartion. Please complete your profile by login with following credentials :</p>
                    <p>Username : ${username}</p> </br>
                    <p>Password : ${plainPassword}</p> 
                    </div>`

                console.log({ email: agent.email, subject, html })
                sendEmail(agent.email, subject, html)

                // agent register successfully add notification to admin and subadmins
                let msg = "Agent Registered (" + agent.email + ")"
                let url = "/d/admin/agentProfile?id=" + agent._id

                await appendNotification(AdminModel, ["ADMIN", "SUBADMIN"], msg, url)

                res.json({
                    status: "1",
                    message: "Agent Register Successfully",
                    details: {
                        agent: {
                            email: agent.email,
                            id: agent._id,
                        },
                    },
                });

            });
        }
    } catch (error) {
        console.log(error);
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error },
        });
    }
};

// const agentRegister = async (req, res) => {
//     try {
//         const { email, password } = req.body;
//         let admin = await AgentModel.findOne({ email })
//         if (admin) {
//             res.json({
//                 status: "0",
//                 message: "Email Id is already exists",
//                 details: {
//                     error: "This email is already used by another Agent"
//                 }
//             })
//         } else {
//             bcrypt.hash(password, saltRounds, async function (err, hash) {
//                 // Store hash in your password DB.
//                 if (err) {
//                     res.json({
//                         status: 0,
//                         message: "Server error occured",
//                         details: {
//                             error: err
//                         }
//                     })
//                     return;
//                 }


//                 if (!result) {
//                     res.json({
//                         status: "0",
//                         message: "Password is wrong",
//                     })
//                     return;
//                 }


//                 let agent = new AgentModel({
//                     email,
//                     password: hash
//                 })

//                 await agent.save();

//                 res.json({
//                     status: "1",
//                     message: "Agent Register Successfully",
//                     details: {
//                         agent: {
//                             email: agent.email,
//                             id: agent._id
//                         }
//                     }
//                 })
//             });

//         }


//     } catch (error) {
//         console.log(error)
//         res.json({
//             status: "0",
//             message: "Server Error Occured",
//             details: { error }
//         })
//     }
// }

const agentAddStudent = async (req, res) => {
    try {
        const { userId } = req.userData
        const { email, phone, fromEnroll } = req.body;

        if (userId) {
            var agentDetails = await AgentModel.findById(userId);
        }

        if (!email || email == "") {
            res.json({
                status: "0",
                message: "Email is required",
            });
            return;
        }
        if (!phone || phone == "") {
            res.json({
                status: "0",
                message: "Phone is required",
            });
            return;
        }
        let student = await StudentModel.findOne({ $or: [{ phone }, { email }] });
        if (student) {
            if (student.agent_id != userId) {
                res.json({
                    status: "0",
                    message: "Student is not registered with this agent"
                })
                return;
            }
            if (fromEnroll) {
                console.log("im here inside from Enroll")

                let studentId = student._id
                let schoolId = req.body.school_id
                let programId = req.body.program_id

                // find Student
                const CONFIG = { headers: { "Authorization": `Bearer ${req.userData.token}` } }
                let ENDPOINT = "http://localhost:3006/student/enroll"
                const response = await axios.post(ENDPOINT, {
                    "student_id": studentId,
                    "school_id": schoolId,
                    "program_id": programId
                },
                    CONFIG
                );
                res.json(response.data)
                return;
            }
            let error = [];
            if (student.phone == phone) {
                error.push("phone");
            }
            if (student.email == email) {
                error.push("email");
            }
            res.json({
                status: "0",
                message: error.join(" and ") + " is already used",
            });
        } else {
            let student = new StudentModel({
                ...req.body,
                agent_id: ObjectId(agentDetails._id)
            })

            try {
                let response = await student.save();
                console.log(response);


            } catch (error) {
                if (error.name === "ValidationError") {
                    let errorsData = {};
                    Object.keys(error.errors).forEach((key) => {
                        errorsData[key] = error.errors[key].message;
                    });

                    res.json({
                        status: "0",
                        name: "ValidationError",
                        message: "Validation Error",
                        details: { error: errorsData },
                    });
                    return;
                }

                console.log(error);
                return;
            }

            let data = {
                time: Date(),
                userId: student._id,
                email: student.email,
                role: "STUDENT"
            }

            const token = jwt.sign(data, process.env.JWT_SECRET_KEY);
            let ENDPOINT = "https://learn-global.onrender.com";
            // let ENDPOINT = "http://localhost:3000";

            sendConfirmationEmail(student.firstName, student.email, token, ENDPOINT + "/d/student");

            let msg = `Student Register (${student.email}) by Agent - ${agentDetails.email}`;
            let url = `/d/admin/studentprofile?id=${student._id}`;
            await appendNotification(AdminModel, ["ADMIN"], msg, url);

            await appendHistory(
                StudentModel,
                student._id,
                "STUDENT",
                "Registration Successful"
            );
            await appendHistory(
                AgentModel,
                userId,
                "AGENT",
                `Student Registered Successfully - ${student.email}`
            );

            if (fromEnroll) {
                console.log("im here inside from Enroll")

                let studentId = student._id
                let schoolId = req.body.school_id
                let programId = req.body.program_id

                // find Student
                const CONFIG = { headers: { "Authorization": `Bearer ${req.userData.token}` } }
                let ENDPOINT = "http://localhost:3006/student/enroll"
                const response = await axios.post(ENDPOINT, {
                    "student_id": studentId,
                    "school_id": schoolId,
                    "program_id": programId
                },
                    CONFIG
                );
                if (response.data.status == "1") {
                    res.json({
                        status: "1",
                        message: "Student Registred and Enrolled successfully"
                    })
                } else {
                    res.json(response.data)
                }
                return;
            }

            res.json({
                status: "1",
                message: "Student Register Successfully",
                details: {
                    student: {
                        email: student.email,
                        id: student._id
                    }
                }
            })

        }
    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

const agentGetStudents = async (req, res) => {
    try {
        const data = req.body
        const { userId } = req.userData

        console.log({ userId })

        // pagination variables
        let perPage = 5;
        let totalPages = 0;
        let currentPage = data.currentPage;

        let totalStudents = await StudentModel.find({ agent_id: ObjectId(userId) })
        let students = await StudentModel.find({ agent_id: ObjectId(userId) }).skip((perPage * (currentPage - 1)) || 0).limit(perPage)

        totalPages = parseInt(totalStudents.length / perPage)
        if (totalStudents.length % perPage != 0) {
            totalPages++;
        }
        console.log({ totalStudents })
        res.json({
            status: "1",
            message: "Students Fetch Successfully",
            details: { students, totalPages, currentPage }
        })


    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

const agentGetProfile = async (req, res) => {
    try {
        if (req.userData.role == "ADMIN") {
            var userId = req.query.id
        } else {
            var { userId } = req.userData
        }
        let agent = await AgentModel.findOne({ _id: userId })
        if (!agent) {
            res.json({
                status: "0",
                message: "Agent Not Found",
            })
        } else {
            res.json({
                status: "1",
                message: "Profile Fetch Successfully",
                details: { agent, baseUrl: "https://learn-global-backend.onrender.com" }
            })
        }
    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

const agentVerifyToken = async (req, res) => {
    try {
        const { userId } = req.userData
        console.log(req.body)
        if (req.body?.token) {
            setWebPushToken(userId, req.body.token)
        }
        let agent = await AgentModel.findOne({ _id: userId })
        if (!agent) {
            res.json({
                status: "0",
                message: "Agent Not Found",
            })
        } else {

            if (agent.status != "APPROVED") {
                res.status(403).json({
                    status: "0",
                    message: agent.status == "UN_APPROVED" ? "You are not verified by Admin" : agent.status == "BLOCKED" ? "You are blocked by Admin" : "",
                })
                return;
            }

            res.json({
                status: "1",
                message: "Agent Verified",
                details: { agent }
            })
        }
    } catch (error) {
        console.log(error)
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error }
        })
    }
}

//...................................................
const agentUpdateProfile = async (req, res) => {
    // console.log("body", req.body)
    // console.log("files", req.files.business_certificate_file[0])
    if (req?.files?.business_certificate_file) {
        req.body.business_certificate = req?.files?.business_certificate_file[0].filename
        req.body.business_certificate_status = "PENDING"
    }
    if (req?.files?.company_logo_file) {
        req.body.company_logo = req?.files?.company_logo_file[0].filename
        req.body.company_logo_status = "PENDING"
    }

    try {
        if (req.userData.role == "ADMIN") {
            var userId = req.query.id;
        } else {
            var { userId } = req.userData;
        }

        let agent = await AgentModel.findOne({ userId });
        if (!agent) {
            res.json({
                status: "0",
                message: "Agent not found.",
                details: {
                    error: "This email is already used by another Student",
                },
            });
        } else {
            if (req.body?.marketing_methods) {

                let marketing_methods = req.body.marketing_methods.split(",")
                if (marketing_methods[0] == "") {
                    if (marketing_methods.length == 0) {
                        req.body.marketing_methods = []
                    } else {
                        req.body.marketing_methods = marketing_methods.splice(1)
                    }
                } else {
                    req.body.marketing_methods = marketing_methods
                }
            }

            console.log(req.body)

            if (req.body.document) {
                // notification
                let doc = req.body.document == "company_logo_status" ? "Company Logo" : "Business Certificate"


                if (req.body?.reason) {
                    console.log(req.body.reason)
                    var msg = "Your Document " + doc + " is Declined because of " + req.body.reason
                } else {
                    var msg = "Your Document " + doc + " is Approved"
                }
                var url = "/d/agent/profile"

                await appendNotification(AgentModel, [], msg, url)

            } else {
                let msg = `Agent- ${agent.email} Update Profile`
                let url = "/d/admin/agentProfile?id=" + agent._id
                await appendNotification(AdminModel, ["ADMIN", "SUBADMIN"], msg, url)
            }

            let agentdata = await AgentModel.findByIdAndUpdate(
                userId,
                req.body,
            );

            try {
                await agentdata.save();

                if (req.business_certificate) {
                    if (agent.business_certificate != "") {
                        var filePath1 = 'uploads/agent/' + agent.business_certificate;
                        fs.unlinkSync(filePath1);
                    }
                }
                if (req.company_logo) {
                    if (agent.company_logo != "") {
                        var filePath2 = 'uploads/agent/' + agent.company_logo;
                        fs.unlinkSync(filePath2);
                    }
                }



            } catch (error) {
                if (error.name === "ValidationError") {
                    let errorsData = {};
                    Object.keys(error.errors).forEach((key) => {
                        errorsData[key] = error.errors[key].message;
                    });

                    res.json({
                        status: "0",
                        name: "ValidationError",
                        message: "Validation Error",
                        details: { error: errorsData }
                    })
                    return;

                }

                console.log(error)
                return;
            }


            res.json({
                status: "1",
                message: "Update Successfully",
                details: agentdata,
            });

        }
    } catch (error) {
        console.log(error);
        res.json({
            status: "0",
            message: "Server Error Occured",
            details: { error },
        });
    }
};


const getNotifications = async (req, res) => {
    console.log("notification data")
    console.log(req.userData)
    const { userId } = req.userData

    const adminData = await AgentModel.findById(userId)


    res.json({
        status: "1",
        message: "Notifications get successfully",
        details: {
            notifications: adminData.notifications.reverse(),
            unseenNotifications: adminData.unseenNotifications
        }
    })
}

// setWebPushToken
const setWebPushToken = async (userId, token) => {
    console.log({ userId, token })
    const agentData = await AgentModel.findOne({ _id: userId })
    agentData.web_push_token = token
    console.log({ agentData })
    agentData.save()

    return true;
}

const getAgentEnrolledList = async (req, res) => {
    let agentId = req.userData.userId
    const protocol = req.protocol;
    const host = req.hostname;
    const url = req.originalUrl;
    const port = process.env.PORT || 3006;

    if (host === "localhost") {
        var fullUrl = `${protocol}://${host}:${port}`;
    } else {
        var fullUrl = `${protocol}://${host}`;
    }

    // get enrolledList details
    let enrolledList = await EnrollModel.aggregate([
        {
            $match: {
                agentId: ObjectId(agentId),
            },
        },
        {
            $lookup: {
                from: "students",
                localField: "student_id",
                foreignField: "_id",
                as: "student_details",
            },
        },
        {
            $unwind: "$student_details"
        },
        {
            $lookup: {
                from: "schools",
                localField: "school_id",
                foreignField: "_id",
                as: "school_details",
            },
        },
        {
            $unwind: {
                path: "$school_details",
            },
        },
        {
            $unwind: {
                path: "$school_details.school_programs",
            },
        },
        {
            $match: {
                $expr: {
                    $eq: ["$school_details.school_programs.program_id", "$program_id"],
                },
            },
        },
        {
            $lookup: {
                from: "countries",
                localField: "school_details.country",
                foreignField: "countryName",
                as: "school_details.countryDetails"
            }
        },
        {
            $unwind: {
                path: "$school_details.countryDetails",
            }
        },
        {
            $lookup: {
                from: "states",
                let: {
                    stateName: "$school_details.state",
                    countryId: "$school_details.countryDetails.countryId",
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$stateName', '$$stateName'] },
                                    { $eq: ['$countryId', '$$countryId'] },
                                ]
                            }
                        }
                    }
                ],
                as: "school_details.stateDetails"
            }
        },
        {
            $unwind: "$school_details.stateDetails",
        },
        {
            $lookup: {
                from: "cities",
                let: {
                    cityName: "$school_details.city",
                    stateId: "$school_details.stateDetails.stateId",
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$cityName', '$$cityName'] },
                                    { $eq: ['$stateId', '$$stateId'] },
                                ]
                            }
                        }
                    }
                ],
                as: "school_details.cityDetails"
            }
        },
        {
            $unwind: "$school_details.cityDetails",
        },
        {
            $lookup: {
                from: "schoolnames",
                let: {
                    localSchoolNameField: '$school_details.school_name',
                    localCountryField: '$school_details.countryDetails.countryId',
                    localStateField: '$school_details.stateDetails.stateId',
                    localCityField: '$school_details.cityDetails.cityId',
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$schoolName', '$$localSchoolNameField'] },
                                    { $eq: ['$country', '$$localCountryField'] },
                                    { $eq: ['$state', '$$localStateField'] },
                                    { $eq: ['$city', '$$localCityField'] },
                                ]
                            }
                        }
                    }
                ],
                // localField: "school_details.school_name",
                // foreignField: "schoolName",
                as: "school_details.school_meta_details",
            },
        },
        {
            $unwind: {
                path: "$school_details.school_meta_details",
            },
        },
        {
            $sort: {
                updatedAt: -1,
            }
        }
    ]);

    res.json({
        status: "1",
        message: "Enrolled Programs details found for Agent",
        details: {
            enrolled_list: enrolledList,
            baseUrl: fullUrl + "/uploads/agent/",
        },
    });

}

module.exports = {
    agentRegister,
    getNotifications,
    agentLogin,
    agentAddStudent,
    agentGetStudents,
    agentGetProfile,
    agentVerifyToken,
    agentUpdateProfile,
    getAgentEnrolledList
}