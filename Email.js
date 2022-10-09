let Crpyto = require('crypto')
let nodemailer = require("nodemailer")


/*
*	SMTP 方式发送
*	exp qq {
		name: 'qqname',
		user:"todo@qq.com",
		password:"todo",
		service:'smtp.qq.com',
		port: 465
	}
	exp outlook {
		name: 'outlookname',
		user: 'todo@outlook.com',
		password: 'todo',
		service: 'smtp.office365.com',
		port: 587
	}
*/
let configSMTP={
	name: '',
	user: '',
	password: '',
	service: '',
	port: 465
}

async function sendSMTP(mail = {to, subject, text, html, from}) {
	return new Promise(async (resolve, reject) => {
		mail.from = configSMTP.user
		try {
			let transporter = nodemailer.createTransport({
				host: configSMTP.service,
				port: configSMTP.port,
				secure: true,
				auth: {
					user: configSMTP.user,
					pass: configSMTP.password
				},
			})
			transporter.sendMail(mail, (error, info) => {
				if (error) {
					console.error(error)
					resolve(0)
				} else {
					resolve(1)
				}
			});
		} catch (e) {
			console.error(e)
			resolve(0)
		}
	})
}

let waitSend = []

/*
* 每隔一段时间 读取邮件列表 发送 每次只发送一封
* 如果发送成功 则更新邮件状态
* 否则更新邮件Id
*/ 
let doSend = async ()=>{
	try {
		if(waitSend.length == 0)
			return
		let r = await sendSMTP(waitSend[0])
		if(r) {
			waitSend.shift()
		}
	} catch(e) {
	}
}

let doJob = async () => {
	setTimeout(async() => {
		await doSend()
		doJob()
	}, 1000 * 10)
}

doJob()

let SendMail = (mail) => {
	if(waitSend.length >= 1000)
		return false
	waitSend.push(mail)
	return true
}

module.exports = {SendMail}

if (require.main === module) {
	setTimeout(async ()=>{
		SendMail({to:"todo@", subject:"easy test", html:`
		<p>this is a easy test</p>
	`})
	}, 1000)
}
