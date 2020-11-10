let mysql = require('mysql');

const mysqlConfig = {
	host : '127.0.0.1',
	port : 3306,
	user : 'root',
	password : '123456',
	database : 'mysql',
}

let ConnPool = mysql.createPool(mysqlConfig);

function MYSQLConnect(a_config) {
	let config = mysqlConfig
	for(let k in config) {
		if(a_config[k]) {
			config[k] = a_config[k]
		}
	}
	ConnPool = mysql.createPool(config)
}

function MYSQLDisconnect() {
	if(ConnPool != undefined) {
		ConnPool.end()
		ConnPool = undefined
	}
}

async function MYSQLQuery(sqlString, params) {
	return new Promise((successCB) => {
		let ret = {
			affectedRows : 0,	// insert update delete
			rows: [],			// select
			msg:""				// err
		}
		if(ConnPool === undefined) {
			console.error("ConnPool undefined")
			ret.msg = "ConnPool undefined"
			return successCB(ret)
		}
		ConnPool.query(sqlString, {}, (err, rows) => {
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

module.exports = {
	MYSQLConnect, MYSQLDisconnect, MYSQLQuery
};
