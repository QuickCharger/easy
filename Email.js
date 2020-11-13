const sgMail = require('@sendgrid/mail')
sgMail.setApiKey("SG.")

function EmailConfig(a_key) {
    if(typeof a_key == "string") {
        sgMail.setApiKey(a_key)
    }
}

async function EmailSend(content = {to, from, subject, text, html}) {
	return new Promise((cbSucc) => {
        sgMail
        .send(content)
        .then(() => {
            cbSucc({result:0, msg:"Email send success"})
        })
        .catch((error) => {
            cbSucc({result:1, msg:error.response.body.errors[0].message})
        })
    })
}

module.exports = {
	EmailConfig, EmailSend
};

if (require.main === module) {
    EmailConfig("SG._INRZsAbQMu2yNmnVlXpJA")
    let send = async () => {
        let result = await EmailSend({
            to: 'test@gmail.com',
            from: 'test@gmail.com',
            subject: 'Sending with SendGrid is Fun',
            text: 'and easy to do anywhere, even with Node.js',
            html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        })
        console.log(result)
    }
    send()
}
