const nodemailer = require("nodemailer");

const sendCustomEmail = async (email, subject, html) => {
    // send email
    console.log(process.env.EMAIL)
    console.log(process.env.EMAIL_PASSWORD)
    const transport = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    transport.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        html: html,
    }).catch(err => console.log(err));
};

module.exports = { sendCustomEmail }
