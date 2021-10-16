let mysql2 = require('mysql2/promise');

const MYSQL2_Config = {
	host : '127.0.0.1',
	port : 3306,
	user : 'root',
	password : '123456',
	database : 'AIMS',
}

class TableUnit
{
	constructor(a_TableName, a_Struct) {
		this.tableName = a_TableName
		this.struct = a_Struct
	}

	GetDDLCreateTable() {
		let ddl = `CREATE TABLE \`${MYSQL2_Config.database}\`.\`${this.tableName}\` (\n  \`Id\` INT NOT NULL AUTO_INCREMENT,\n  \`Creation\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  \`LastModified\` DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  \`RecordState\` INT NOT NULL DEFAULT 1,`
		for(let i in this.struct) {
			let info = this.struct[i]
			ddl += `\n  ${info.name} ${info.type}`
			if(typeof(info.default) != 'undefined' && info.default != '') {
				ddl += ` DEFAULT '${info.default}'`
			}
			ddl += ','
		}
		ddl += `\n  PRIMARY KEY (\`Id\`)\n)`
		return ddl
	}

	// 获取更新table结构的语句
	// 为了确保数据安全 最好不要执行此处
	async GetDDLUpdateTable(oldTableInfo) {
		for(let i in this.struct) {
			let info = this.struct[i]
			let oldColumn
			oldTableInfo.rows.forEach((item) => {
				if(item.COLUMN_NAME == info.name)
					oldColumn = item
			})

			let oldtype = oldColumn ? oldColumn.DATA_TYPE : ""
			if(oldColumn && oldColumn.DATA_TYPE == 'varchar')
				oldtype += `(${oldColumn.CHARACTER_MAXIMUM_LENGTH})`
			
			// if 添加列
			// else if 修改类型
			// else if 修改默认值
			if(oldColumn == undefined) {
				let ddl = `ALTER TABLE ${this.tableName} ADD COLUMN \`${info.name}\` ${info.type}`
				// default
				if(info.default.toUpperCase() === 'NULL')
					ddl += ` DEFAULT NULL`
				else if(info.default.length > 0)
					ddl += ` DEFAULT '${info.default}'`
				// after
				if(i == 0)
					ddl += ` FIRST`
				else
					ddl += ` AFTER \`${a_struct[i-1].name}\``
				await this.Query(ddl)
			} else if(oldtype.toUpperCase() != info.type.toUpperCase()) {
				// 旧的列改个名字存放 避免引起数据丢失
				// 暂时不处理
				// let ddl = `ALTER TABLE ${a_tableName} CHANGE COLUMN \`${info.name}\` \`${info.name}_${Math.round(Math.random()*1000)}\` ${oldtype}`
				// if(oldColumn.IS_NULLABLE == 'YES')
				// 	ddl += ' NULL'
				// if(info.default.toUpperCase() === 'NULL')
				// 	ddl += ` DEFAULT NULL`
				// else if(info.default.length > 0)
				// 	ddl += ` DEFAULT '${info.default}'`
				// console.log(ddl)
			} else if(oldColumn.COLUMN_DEFAULT != info.default) {
				// 此处修改默认值时使用老的类型 避免引起类型变动
				let ddl = `ALTER TABLE ${this.tableName} CHANGE COLUMN \`${info.name}\` \`${info.name}\` ${oldtype}`
				if(oldColumn.IS_NULLABLE == 'YES')
					ddl += ' NULL'
				if(info.default.toUpperCase() === 'NULL')
					ddl += ` DEFAULT NULL`
				else if(info.default.length > 0)
					ddl += ` DEFAULT '${info.default}'`
				await this.Query(ddl)
			}
		}
	}
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
	* a_Struct
	*	[
	*		{ "name":"int",   "type":"INT",           "default":""     }, 
	*		{ "name":"char",  "type":"VARCHAR(255)",  "default":"null" },
	*	]
	*/
	async RegistTableStruct(a_TableName, a_Struct = []) {
		if(!a_TableName)
			return
		let cTable = new TableUnit(a_TableName, a_Struct)
		this.tablesInfo[a_TableName] = cTable

		if(false)
			return
		
		// 同步表结构
		// 创建表
		let oldTableInfo = await this.Query("select * from information_schema.columns where TABLE_SCHEMA=? and TABLE_NAME=?", [MYSQL2_Config.database, a_TableName])
		if(oldTableInfo.rows.length == 0) {
			let ddl = cTable.GetDDLCreateTable()
			await this.Query(ddl)
			return
		}

		// 更新表结构
		// 应该不执行为好
		{
			let ddl = cTable.GetDDLUpdateTable(oldTableInfo)
		}
	}

	async Query(sqlString, params = []) {
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

	GetTable(a_TableName) {
		return this.tablesInfo[a_TableName]
	}
}

module.exports = {
	MYSQL2, MYSQL2_Config
};

if (require.main === module) {
	let m = new MYSQL2
	m.RegistTableStruct("test", [
		{"name":"name1", "type":"int", "default":"123"},
		{"name":"name2", "type":"INT", "default":"2345"},
	])

	let tTest = m.GetTable("test").FindOne({
		where: {Sort: {[this.Op.lt]: 0}},
		order: [ ['Sort', 'DESC']]
	})
	tTest.name1 = 234
	tTest.Save()
}
