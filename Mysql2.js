let mysql2 = require('mysql2/promise');

const MYSQL2_Config = {
	host : '127.0.0.1',
	port : 3306,
	user : 'root',
	password : '123456',
	database : 'test',
}

class MYSQL2
{
	constructor(config = MYSQL2_Config) {
		this.ConnPool = mysql2.createPool(config);
		this.tablesInfo = {}
	}
	
	Connect(a_config) {
		let config = mysqlConfig
		for(let k in config) {
			if(a_config[k]) {
				config[k] = a_config[k]
			}
		}
		this.ConnPool = mysql2.createPool(config)
	}

	Disconnect() {
		if(this.ConnPool != undefined) {
			this.ConnPool.end()
			this.ConnPool = undefined
		}
	}

    /*
	* 注册表结构
	* 创建表
	* 添加列
	* 修改类型
    * a_struct
    *   [
    *     { "name":"int",           "type":"INT",       "default":""}, 
    *     { "name":"char",      "type":"VARCHAR(255)", "default":"null" },
    *   ]
    */
    async RegistTableStruct(a_tableName, a_struct = []) {
		if(!a_tableName)
			return
		this.tablesInfo[a_tableName] = a_struct

		if(false)
			return

		// 同步表结构
		// 创建表
		let allTableName = await this.Query("select * from information_schema.columns where TABLE_SCHEMA=? and TABLE_NAME=?", [MYSQL2_Config.database, a_tableName])
		if(allTableName.rows.length == 0) {
			// 创建表
			let ddl = `CREATE TABLE \`${MYSQL2_Config.database}\`.\`${a_tableName}\` (\n  \`Id\` INT NOT NULL AUTO_INCREMENT,\n  \`Creation\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  \`LastModified\` DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  \`RecordState\` INT NOT NULL DEFAULT 1,`
			for(let i in a_struct) {
				let info = a_struct[i]
				ddl += `\n  ${info.name} ${info.type}`
				if(typeof(info.default) != 'undefined' && info.default != '') {
					ddl += ` DEFAULT '${info.default}'`
				}
				ddl += ','
			}
			ddl += `\n  PRIMARY KEY (\`Id\`)\n)`
			await this.Query(ddl,[])
			return
		}

		for(let i in a_struct) {
			let info = a_struct[i]
			let oldColumn
			allTableName.rows.forEach((item) => {
				if(item.COLUMN_NAME == info.name)
					oldColumn = item
			})

			let oldtype = oldColumn.DATA_TYPE
			if(oldColumn.DATA_TYPE == 'varchar')
				oldtype += `(${oldColumn.CHARACTER_MAXIMUM_LENGTH})`

			// if 添加列
			// else if 修改类型
			// else if 修改默认值
			if(oldColumn == undefined) {
				console.log(`add column ${info.name}`)
			} else if(oldtype.toUpperCase() != info.type.toUpperCase()) {
				console.log(`mod oldtype ${oldColumn.DATA_TYPE} type ${info.name} ${info.type}`)
			}
			
		}
    }

	async Query(sqlString, params) {
		let ret = {
			affectedRows : 0,	// insert update delete
			rows: [],			// select
			msg:""				// err
		}
		if(this.ConnPool === undefined) {
			ret.msg = "ConnPool undefined"
            return ret
		}
		console.log(`do sql: ${sqlString}`)
        const [rows, fields] = await this.ConnPool.execute(sqlString, params)
        ret.affectedRows = fields
        ret.rows = rows
        return ret
	}
}

module.exports = {
	MYSQL2, MYSQL2_Config
};

if (require.main === module) {
	let m = new MYSQL2
	m.RegistTableStruct("test", [{"name":"name1", "type":"int", "default":"123"}, {"name":"name2", "type":"varchar(255)", "default":"234"}])
	setTimeout(async ()=>{
        await m.RegistTableStruct()
	},100)
}
