const nodemailer = require("nodemailer");

const sendForgotPasswordEmail = async (name, email, confirmationCode, domain) => {
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
        subject: "Forgot your Learn Global Account",
        html: `<h1>Forgot Password</h1>
          <h2>Hello ${name}</h2>
          <p>Clink on the following link to forgot password : </p>
          <a href=${domain}/forgot/${confirmationCode}> Click here</a>
          </div>`,
    }).catch(err => console.log(err));
};

module.exports = { sendForgotPasswordEmail }
