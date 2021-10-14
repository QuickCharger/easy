let mysql = require('mysql');

const MYSQL_Config = {
	host : '127.0.0.1',
	port : 3306,
	user : 'root',
	password : '123456',
	database : 'mysql',
}

class MYSQL
{
	constructor(config = MYSQL_Config) {
		this.ConnPool = mysql.createPool(config);
	}
	
	Connect(a_config) {
		let config = mysqlConfig
		for(let k in config) {
			if(a_config[k]) {
				config[k] = a_config[k]
			}
		}
		this.ConnPool = mysql.createPool(config)
	}

	Disconnect() {
		if(this.ConnPool != undefined) {
			this.ConnPool.end()
			this.ConnPool = undefined
		}
	}

	async Query(sqlString, params) {
		return new Promise((successCB) => {
			let ret = {
				affectedRows : 0,	// insert update delete
				rows: [],			// select
				msg:""				// err
			}
			if(this.ConnPool === undefined) {
				console.error("ConnPool undefined")
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

module.exports = {
	MYSQL, MYSQL_Config
};

if (require.main === module) {
	let m = new MYSQL
	setTimeout(async ()=>{
		let r = await m.Query("show databases")
		console.log(r.rows)
		console.log(r.msg)
	},1000)
}

