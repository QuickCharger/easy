
/*
typeof true		boolean
typeof 1234		number
typeof NaN		number
typeof "12"		string
typeof function(){}		function
typeof []		object
typeof {}		object
typeof null		object
typeof undefined undefined
typeof unknownVariable	undefined
额外判断typeof 是为了确保传入已经定义过 否则undefined.prototype报错
*/
let IsBool = p => typeof p === "boolean"
let IsNumber = p => typeof p === "number" && !isNaN(p)
let IsNan = p => isNaN(p)
let IsString = p => typeof p === "string"
let IsFunction = p => typeof p === "function"
let IsArray = p => typeof p === "object" && Object.prototype.toString.call(p) === '[object Array]'
let IsObject = p => typeof p === "object" && Object.prototype.toString.call(p) === '[object Object]'
let IsDefined = p => typeof p !== "undefined"

let ToNumber = (n, defaul = 0) => IsNumber(n) ? +n : defaul
let ToString = (str, defaul = '') => IsString(str) ? str : defaul

// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math/round
let Round = (number, precision) => {
	return Math.round(+number + 'e' + precision) / Math.pow(10, precision)
	//same as:
	//return Number(Math.round(+number + 'e' + precision) + 'e-' + precision);
}

let defaultSleepMS = 1000
function Sleep (ms = defaultSleepMS, cb = null) {
	return new Promise(
		(r, j) => setTimeout(async () => {
			if (cb) {
				await cb()
			}
			r()
		}, ms)
	)
}

module.exports = {
	IsBool, IsNumber, IsNan, IsString, IsFunction, IsArray, IsObject, IsDefined,
	ToNumber, ToString, Round, Sleep,
}

if (require.main === module) {
	setTimeout(async () => {
		let obj = { a: null }

		if (IsDefined(obj.a))
			console.log("defined obj.a")	// this
		else
			console.log("not define obj.a")

		if (obj.a === null)
			console.log("obj.a is null")	// this
		else
			console.log("obj.a not null")

		if (IsDefined(obj.b))
			console.log("defined obj.b")
		else
			console.log("not define obj.b")	// this

		if (obj.b === null)
			console.log("obj.b is null")
		else
			console.log("obj.b not null")	// this

	}, 100)
}
