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

const appendNotification = async (model, users, msg, url, body = "") => {
    // send msg
    await model.updateMany(
        model == AdminModel ? {
            role: { $in: users },
        } : {},
        {
            $push: {
                notifications: {
                    message: msg,
                    redirectUrl: url,
                    body,
                    created: Date.now(),
                }
            },
            $inc: {
                unseenNotifications: 1
            }
        }
    )

    // get admin token

    let adminData = await model.findOne()

    try {
        // let ENDPOINT = "https://learnglobal-backend.onrender.com/notification"
        let ENDPOINT = "http://localhost:3006/notification"

        const response = await axios.post(ENDPOINT, {
            title: msg,
            body: body,
            token: adminData.web_push_token,
            redirectUrl: url,
        });

        console.log({ response })
    } catch (error) {
        console.log({ error1: error })
    }


}

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
        const { email, password } = req.body;
        const { userId } = req.userData
        let student = await StudentModel.findOne({ email })
        if (student) {
            res.json({
                status: "0",
                message: "Email Id is already used by another Student",
                details: {
                    error: "This email is already used by another Student"
                }
            })
        } else {
            bcrypt.hash(password, saltRounds, async function (err, hash) {
                // Store hash in your password DB.
                if (err) {
                    res.json({
                        status: "0",
                        message: "Server error occured",
                        details: {
                            error: err
                        }
                    })
                }

                let student = new StudentModel({
                    email,
                    password: hash,
                    agent_id: userId,
                })

                await student.save();

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

const agentGetStudents = async (req, res) => {
    try {
        const data = req.body
        const { userId } = req.userData

        // pagination variables
        let perPage = 5;
        let totalPages = 0;
        let currentPage = data.currentPage;


        let totalStudents = await StudentModel.find({ agent_id: userId })
        let students = await StudentModel.find({ agent_id: userId }).skip((perPage * (currentPage - 1)) || 0).limit(perPage)

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
                details: { agent, baseUrl: "https://learnglobal-backend.onrender.com" }
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



module.exports = {
    agentRegister,
    getNotifications,
    agentLogin,
    agentAddStudent,
    agentGetStudents,
    agentGetProfile,
    agentVerifyToken,
    agentUpdateProfile
}