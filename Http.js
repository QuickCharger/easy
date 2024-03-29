let http = require('http')
let https = require('https')
let { IsString } = require('./easy')

let HttpRequest = async function (host, port = null, path = '', content = '', method = 'POST', isHttps = false, header) {
	content = IsString(content) ? content : JSON.stringify(content)
	port = port == null ? (isHttps ? 443 : 80) : port

	return new Promise((successCB) => {
		let data = ''
		let options = {
			host,
			port,
			path,
			method,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': content.length,
				...header,
			}
		}

		let hs = isHttps ? https : http
		hs.request(options, function (res) {
			res.setEncoding('utf8')
			res.on('data', function (a_data) {
				data += a_data
			})
		}).on('error', function (err) {
			console.error(err)
			return successCB('')
		}).on('close', () => {
			return successCB(data)
		}).write(content)
	})
}


module.exports = { HttpRequest }

if (require.main === module) {
	setTimeout(async () => {
		let ret
		// ret = await HttpRequest('www.baidu.com', 443, '', '', 'GET', true)
		// console.log(ret)

		ret = await HttpRequest('www.baidu.com', 80, '', '', 'GET')
		console.log(ret)
	}, 100)
}
