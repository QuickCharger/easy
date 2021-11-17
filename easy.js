
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

module.exports={
	IsBool, IsNumber, IsNan, IsString, IsFunction, IsArray, IsObject, IsDefined,
}
