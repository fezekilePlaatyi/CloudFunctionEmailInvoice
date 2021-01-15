const functions = require('firebase-functions')
const admin = require('firebase-admin')
require('dotenv').config()
const nodemailer = require("nodemailer")
const moment = require('moment');
const pdf = require('html-pdf')
const {Storage} = require('@google-cloud/storage')
const path = require('path')
const os = require('os')
const cors = require('cors')({origin: true});
admin.initializeApp()
const storage = new Storage({
    projectId: 'hydradet-online-store',
    keyFilename: 'hydradet-online-store-firebase-adminsdk-rv6ut-79d88c99fe.json'
})
const bucket = storage.bucket('hydradet-online-store.appspot.com')

const DCX_EMAIL_ACCOUNT = process.env.DCX_EMAIL_ACCOUNT
const DCX_EMAIL_PASSWORD = process.env.DCX_EMAIL_PASSWORD
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER

exports.sendInvoiceEmail = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        function setAndReturnInvoiceHtml(invoiceData, dateCreated) {
            let dateTime = moment(dateCreated).add(2, 'hours').format("DD MMM YY, h:mm A");
            var htmlTableBody = "";
            var subTotalPrice = 0;
        
            invoiceData.forEach((item) => {
                let total = item.price * item.quantity
                subTotalPrice += total
        
                // total.toLocaleString('en-US', {maximumFractionDigits:2})

                htmlTableBody += "<tr>";
                htmlTableBody +=
                `<tr>
                    <td style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">${item.name}</td>
                    <td style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">${item.price.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                    <td style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top; text-align:center">${item.quantity}</td>
                    <td style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">${total.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                </tr>
                `
                htmlTableBody += "</tr>";
            });     
        
            var html = 
            `
            <!doctype html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Invoice </title>
            </head>
            <body>
                <div class="invoice-box" style="max-width: 800px;margin: auto;padding: 30px;border: 1px solid #eee;box-shadow: 0 0 10px rgba(0, 0, 0, .15);font-size: 16px;line-height: 24px;font-family: 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;color: #555;">
                    <table cellpadding="0" cellspacing="0" style="width: 100%;line-height: inherit;text-align: left;">
                        <tr class="top">
                            <td colspan="2" style="padding: 5px;vertical-align: top;">
                                <table style="width: 100%;line-height: inherit;text-align: left;">
                                    <tr>
                                        <td class="title" style="padding: 5px;vertical-align: top;padding-bottom: 20px;font-size: 45px;line-height: 45px;color: #333;">
                                            <img src="https://firebasestorage.googleapis.com/v0/b/online-store-e8ed0.appspot.com/o/assets%2Fdcx_logo.png?alt=media&token=dd699cab-a2b4-4572-b1f8-1748e32881e9" style="width:100%; max-width:180px;">
                                        </td>
                                        
                                        <td style="padding: 5px;vertical-align: top;text-align: right;padding-bottom: 20px;">
                                            Invoice Number:  #${dateCreated}<br>
                                            Created: ${dateTime}<br>
                                            Payment Method : Credit Card
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <tr class="information">
                            <td colspan="2" style="padding: 5px;vertical-align: top;">
                                <table style="width: 100%;line-height: inherit;text-align: left;">
                                    <tr>
                                        <td style="padding: 5px;vertical-align: top;padding-bottom: 40px;">
                                            Invest in you Future Now!
                                        </td>
                                        
                                        <td style="padding: 5px;vertical-align: top;text-align: right;padding-bottom: 40px;">
                                            DCX Bullion.<br>
                                            info@dcxbullion.com
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
        
                    <table style="font-family: Tahoma, 'Helvetica Neue', 'Helvetica', Helvetica, Arial, sans-serif;border-collapse: collapse;width: 100%;color: #555;line-height: inherit;text-align: left;">
                        <tr class="tbl-heading" style="background: #eee;border-bottom: 1px solid #ddd;font-weight: bold;">
                            <th style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">Name</th>
                            <th style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">Price</th>
                            <th style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">Quantity</th>
                            <th style="border-bottom: 1px solid #dddddd;text-align: left;padding: 8px;vertical-align: top;">Total</th>
                        </tr>
                        ${htmlTableBody}
                    </table>
                    <div style="display: flex; justify-content: flex-end; font-weight: bold;">
                        <div><br> Total: R ${subTotalPrice.toLocaleString('en-US', {maximumFractionDigits:2})}</div>
                    </div>
                </div>
            </body>
            </html>
            `
            return html
        }

        const filename = Date.now()+'.pdf'
        const options = {
            "format": 'A4',
            "orientation": "portrait",
            "border": {
                "top": "20px",            // default is 0, units: mm, cm, in, px
                "right": "20px",
                "bottom": "20px",
                "left": "20px"
            },
            "footer": {
                "height": "28mm",
                "contents": {
                  default: '<span style="color: #eee;"><a href="https://dcx-online-store.web.app/">https://dcx-online-store.web.app/</a></span>',
                }
            },
        };
        let clientEmailAddress = req.body.userDetails.email
        let dateTime = moment(req.body.dateCreated).add(2, 'hours').format("DD MMM YY, h:mm A");
        let customerNames = req.body.userDetails.firstName + " " + req.body.userDetails.lastName
        
        const localPDFFile = path.join(os.tmpdir(), filename);
        const  html = setAndReturnInvoiceHtml(req.body.invoiceData, req.body.dateCreated)

        pdf.create(html, options).toFile(localPDFFile, function(err, res) {
            if (err) {
                console.log(err);
                res.send(err);
            }
    
            return bucket.upload(localPDFFile, {
                destination: filename,
                metadata: {
                    contentType: 'application/pdf'
                }
            }).then(() => {
                var url = "https://storage.googleapis.com/hydradet-online-store.appspot.com/"+filename
                
                var smtpConfig = {
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // use SSL
                    auth: {
                        user: DCX_EMAIL_ACCOUNT,
                        pass: DCX_EMAIL_PASSWORD
                    }
                };
                var transporter = nodemailer.createTransport(smtpConfig);
        
                var mailOptions = {
                    attachments: [
                    {
                        filename: 'Invoice.pdf',
                        path: url,
                    }],
                    from: `DCX Online Store <${DCX_EMAIL_ACCOUNT}>`,
                    to: ['fezekileplaatyi@gmail.com', clientEmailAddress],
                    subject: "Invoice",
                    html: 
                    `
                    <p>Dear ${customerNames},</p>
        
                    <p>Thank you for your purchase at DCX Online Store! </p>
                    <p>Please find your the invoice of your purchase on date ${dateTime}, attached to this email.</p>
                    <p>Kind Regards,</p>
                    <p>DCX Online Store</p>
                    `
                };
        
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                        console.log("error sending email")
                        console.log(error)
                        res.send("error");
                    } else {
                        res.send("sent");
                    }
                }); 


            }).catch(error => {
                console.error(error);
                res.send(error);
            });
        }); 
    })
});