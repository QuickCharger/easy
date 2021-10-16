const Crypto = require('crypto')

function Rand(a_Min=0, a_MaxNotInclude=100) {
	return Math.floor(Math.random()*(a_MaxNotInclude-a_Min)) + a_Min
}

function RandString(a_Length, a_CharSet='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
	ret = ''
	for(let i = 0; i < a_Length; ++i) {
		let rand = Rand(0, a_CharSet.length)
		ret += a_CharSet.charAt(rand)
	}
	return ret
}

String.prototype.Pop = function (a_length = 1) {
	let l = this.length > a_length ? a_length : this.length
	return this.substring(0, this.length - l)
}


let RandString_Fast = (a_Length) => Crypto.randomBytes(a_Length*0.75 + 0.25).toString('base64').slice(0, a_Length)

module.exports={RandString, RandString_Fast}

if (require.main === module) {
	{
		let tBegin = process.uptime()
		for(let i = 0; i < 100; ++i) {
			let tmp = RandString(1000 * i)
		}
		let tEnd = process.uptime()
		console.log(`RandString run 100 times cost ${(tEnd-tBegin)*1000}ms`)
	}

	{
		let tBegin = process.uptime()
		for(let i = 0; i < 100; ++i) {
			let tmp = RandString_Fast(1000 * i)
		}
		let tEnd = process.uptime()
		console.log(`RandString_Fast run 100 times cost ${(tEnd-tBegin)*1000}ms`)
	}
}
