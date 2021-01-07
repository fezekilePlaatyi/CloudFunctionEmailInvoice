const functions = require('firebase-functions')
const nodemailer = require("nodemailer")
const moment = require('moment');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
admin.initializeApp();

require('dotenv').config()
const DCX_EMAIL_ACCOUNT = process.env.DCX_EMAIL_ACCOUNT
const DCX_EMAIL_PASSWORD = process.env.DCX_EMAIL_PASSWORD
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER

exports.sendInvoiceEmail = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        let tableBody = []
        let clientEmailAddress = req.body.userDetails.email
        let dateTime = moment(req.body.dateCreated).format("DD MMM YY, h:mm A");
        let customerNames = req.body.userDetails.firstName + " " + req.body.userDetails.lastName

        req.body.invoiceData.forEach((item) => {
            let total = item.price * item.quantity
            let row = 
            `<tr>
                <td style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">${item.name}</td>
                <td style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">${item.description}</td>
                <td style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">${item.price}</td>
                <td style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">${item.quantity}</td>
                <td style="padding: 5px; text-align: left;border: 1px solid black; border-collapse: collapse;">R ${total}</td>
            </tr>
            `
            tableBody.push(row)
        });        

        var transporter = nodemailer.createTransport({
            service: EMAIL_PROVIDER,
            auth: {
                user: DCX_EMAIL_ACCOUNT,
                pass: DCX_EMAIL_PASSWORD
            }
        });

        var mailOptions = {
            from: `DCX Online Store <${DCX_EMAIL_ACCOUNT}>`,
            to: ['fezekileplaatyi@gmail.com', clientEmailAddress],
            subject: "Invoice",
            html: 
            `
            <p>Dear ${customerNames},</p>

            <p>Thank you for your purchase at DCX Online Store! </p>
            <p>Please find below your the invoice of your purchase</p>
            <h3>Date: ${dateTime}</h3>
            <table style="width:100%; border: 1px solid black; border-collapse: collapse;">                
                <tr>
                    <th style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">Name</th>
                    <th style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">Description</th>
                    <th style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">Price</th>
                    <th style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">Quantity</th>
                    <th style="padding: 5px; text-align: left; border: 1px solid black; border-collapse: collapse;">Total</th>
                </tr>
                ${tableBody}
            </table>
            <p>Kind Regards,</p>
            <p>DCX Online Store</p>
            `
        };

        transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                res.status(200).send(error);
            } else {
                res.status(200).send('Email sent: ' + info.response);
            }
        });   
    })
});