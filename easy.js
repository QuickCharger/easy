const Date = require('./Date')
const {RandString, RandString_Fast} = require('./String')
const {HttpRequest, SendMail} = require('./Http')
const {MYSQLConnect, MYSQLDisconnect, MYSQLQuery} = require('./Mysql')

let IsNumber = (param1) => {
	return Number.isInteger(param1)
}

let IsString = (param1) => {
	return typeof param1 === "string"
}

let IsArray = (param1) => {
	return Object.prototype.toString.call(param1) == '[object Array]';
}

let IsObject = (param1) => {
	return Object.prototype.toString.call(param1) == '[object Object]';
} 

module.exports={
	IsNumber, IsString, IsArray, IsObject,
	RandString, RandString_Fast,
	HttpRequest, SendMail,
	MYSQLConnect, MYSQLDisconnect, MYSQLQuery
}
