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

module.exports={
	IsNumber, IsString,
	RandString, RandString_Fast,
	HttpRequest, SendMail,
	MYSQLConnect, MYSQLDisconnect, MYSQLQuery
}
