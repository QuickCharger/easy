let Crpyto = require('crypto')

let DLOG = (str) => console.debug(`EMAIL ${str}`)
let LOG = (str) => console.log(`EMAIL ${str}`)
let WARN = (str) => console.warn(`EMAIL ${str}`)
let ERROR = (str) => console.error(`EMAIL ${str}`)

// SMTP 方式发送
let configSMTP={
	name: '',
	user:"",
	password:"",
	service:'',
	port: 465
}

const MYSQL_Config = {
    host : '127.0.0.1',
    port : 3306,
    user : 'root',
    password : '123456',
	database : 'mysql',
}

class MYSQL
{
	constructor() {
		this.ConnPool = null
	}
	
	Connect() {
		try {
			if(this.ConnPool)
				this.ConnPool.end()
			let mysql = require('mysql');
			this.ConnPool = mysql.createPool(MYSQL_Config)
			LOG(`create mysql pool success`)
		} catch(e) {
			this.ConnPool = null
			WARN(`create mysql pool failed.`)
		}
	}

	async Query(sqlString, params) {
		// DLOG(sqlString)
		return new Promise((successCB) => {
			let ret = {
				affectedRows : 0,	// insert update delete
				rows: [],			// select
				msg:""				// err
			}
			if(this.ConnPool == undefined) {
				ret.msg = "ConnPool undefined"
				return successCB(ret)
			}
			this.ConnPool.query(sqlString, {}, (err, rows) => {
				if(err) {
					ret.msg = err.message
				} else {
					ret.affectedRows = rows.affectedRows ? rows.affectedRows : 0;
					ret.rows = rows.constructor === Array ? rows : []
				}
				return successCB(ret)
			})
		})
	}
}

// 本地数据存储1
let MYSQL_Table = "Email"
let sql = new MYSQL
sql.Connect()

async function sendSMTP(mail = {to, subject, text, html, from}, config) {
	return new Promise(async (resolve, reject) => {
		try {
			const nodemailer = require("nodemailer");
			const transporter = nodemailer.createTransport({
				host: config.service,
				port: config.port,
				secure: true,
				auth: {
					user: config.user,
					pass: config.password
				},
			})
			transporter.sendMail(mail, (error, info) => {
				if (error) {
					console.log(error)
					resolve(0)
				} else {
					resolve(1)
				}
			});
		} catch (e) {
			console.log(e)
			resolve(0)
		}
	})
}

async function backupMail(mail = {from, to, subject, text, html}, extern={Id : undefined, SendSuccess}) {
	return new Promise(async (resolve, reject) => {
		try {
			let c = JSON.stringify(mail)
			let md5 = Crpyto.createHash("md5").update(c).digest("hex").toUpperCase()
			// if extra.Id then update
			// else insert
			let Id = extern.Id
			let SendSuccess = extern.SendSuccess ? 1 : 0;
			if(Id)
				await sql.Query(`UPDATE ${MYSQL_Table} SET LastSendTime=NOW(), SendSuccess=${SendSuccess} WHERE Id=${Id}`)
			else
				await sql.Query(`INSERT INTO ${MYSQL_Table}(Content, Verify, LastSendTime, SendSuccess) VALUE('${c}', '${md5}', NOW(), ${SendSuccess})`)
		} catch(e) {
		}
		resolve(null)
	})
}

async function SendMail(mail = {from, to, subject, text, html}) {
	mail.from = configSMTP.user
	mail.html = mail.html. replace(/\n/g,"").replace(/\t/g, "")
	let md5 = Crpyto.createHash("md5").update(JSON.stringify(mail)).digest("hex").toUpperCase()
	let old = await sql.Query(`SELECT * FROM Email WHERE Verify='${md5}'`)
	if(old.rows.length > 0 && old.rows[0].SendSuccess)
		return 0
	let r = await sendSMTP(mail, configSMTP);
	LOG(`send ${r?"success":"failed"}. ${JSON.stringify(mail)}`)
	await backupMail(mail, {Id:old.rows.length > 0 ? old.rows[0].Id : undefined, SendSuccess:r})
	return 0
}

/*
* 每隔一段时间 读取邮件列表 发送 每次只发送一封
* 如果发送成功 则更新邮件状态
* 否则更新邮件Id
*/ 
setInterval(async ()=>{
	try {
		let r = await sql.Query(`SELECT * FROM ${MYSQL_Table} WHERE SendSuccess = 0 ORDER BY LastSendTime ASC LIMIT 1`)
		if(r.rows.length == 0)
			return
		// SendMail(JSON.parse(r.rows[0].Content.replace(/\n/g,"\\\\n").replace(/\t/g, "\\t")))
		SendMail(JSON.parse(r.rows[0].Content))
	} catch(e) {
	}
}, 10 * 1000)

module.exports = {SendMail}

if (require.main === module) {
	setTimeout(async ()=>{
		let userservice = await sql.Query(`SELECT DISTINCT Email FROM UserService s LEFT JOIN User u ON s.UserId=u.Id WHERE Status=0`)
		for(let i in userservice.rows) {
			await SendMail({to:userservice.rows[i].Email, subject:"test", html:`
			<p>no text</p>
			`})
		}
	}, 1000)
}

/*
CREATE TABLE `Email` (
  `Id` INT NOT NULL AUTO_INCREMENT,
  `Creation` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `LastModified` DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `RecordState` INT NOT NULL DEFAULT 0,
  `Content` TEXT NULL,
  `Verify` VARCHAR(255) NOT NULL,
  `LastSendTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `SendSuccess` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`),
  INDEX `verify` (`Verify` ASC) VISIBLE
);
*/
