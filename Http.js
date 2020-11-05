const http = require('http')
const nodemailer = require("nodemailer")
const qs = require('qs')

function HttpRequest(config = {host:"127.0.0.1", port:80, path:"", method:"POST"}, a_content, cb) {
	let content = qs.stringify(a_content);
	let options = {
		port:config.port,
		host:config.host,
		path:config.path,
		method:config.method,
		headers:{
			'Content-Type':'application/x-www-form-urlencoded',
			'Content-Length':content.length,
		}
	}

	let req = http.request(options, function(res){
		res.setEncoding('utf8');
		res.on('data',function(data){
			cb && cb(data)
		});
	}).on('error', function(err){
		console.log(options + " " + err.message)
	})

	req.write(content)
	req.end();
}

function SendMail(config = {host,port,secure:true,user,password}, content) {
	try{
		const mailer = nodemailer.createTransport({
			host:config.host,
			port:config.port,
			auth:{
				user:config.user,
				pass:config.password
			},
			secure:true
		})
		mailer.sendMail({
			from:content.from,
			to:content.to,
			subject:content.subject,
			text:content.text,
			html:content.html
		}, (error, info) => {
			if (error) {
				console.log(`err ${JSON.stringify(error)}`)
			}
			if(info) {
				console.log(`info ${JSON.stringify(info)}`)
			}
		});
	} catch(e) {
		console.log(`e ${JSON.stringify(e)}`)
	}
}

module.exports={HttpRequest, SendMail}
