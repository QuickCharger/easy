const http = require('http')
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

async function HttpRequest_Async(options, intpu_data = '') {
	return new Promise((successCB) => {
		let data = ''
		https.request(options, function(res){
			res.setEncoding('utf8');
			res.on('data',function(a_data){
				data += a_data
			});
		}).on('error', function(err){
			return successCB('')
		}).on('close', () => {
			return successCB(data)
		}).write(intpu_data)
	})
}

module.exports={HttpRequest, HttpRequest_Async}
