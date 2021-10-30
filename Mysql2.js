let mysql2 = require('mysql2/promise');
let {IsNumber, IsString} = require('./easy')
require('./String.js')

const MYSQL2_Config = {
	host : '127.0.0.1',
	port : 3306,
	user : 'root',
	password : '123456',
	database : 'test',
}

class TableUnit
{
	constructor(a_TableName, a_Struct, a_Mysql) {
		this._tableName = a_TableName
		this._struct = a_Struct
		this._mysql = a_Mysql
		this.column_Id = null

		// fix
		for(let i in this._struct) {
			let column = this._struct[i]
			if(column.type.toUpperCase() === "INT") {
				column.default = +column.default || null
			} else if(column.type.toUpperCase() === "TEXT") {	// BLOB, TEXT, GEOMETRY or JSON can't have a default value
				column.default = undefined
			}
		}

		// // {"name":"name2", "type":"INT", "default":"null"},
		// for(let i in this._struct) {
		// 	let column = this._struct[i]
		// 	if(!IsString(column.name) || !IsString(column.type) || ()) {
		// 		throw(`TableUnit. constructor. ${JSON.stringify(column)}`)
		// 	}

		// }
		// 每列都设定一个变量三个相应的函数
		// column_ColumnName
		// setColumnName()
		// getColumnName()
		// column_ColumnName_need_update() 标记ColumnName是否需要更新
		for(let i in this._struct) {
			let column = this._struct[i]
			this[`set${column.name}`] = (a_v) => {
				this[`column_${column.name}`] = a_v
				this[`column_${column.name}_need_update`] = true
			}
			this[`get${column.name}`] = () => {
				return this[`column_${column.name}`]
			}
			this[`valid${column.name}`] = () => {
				let v = this[`column_${column.name}`]
				if(v === null)
					return true;
				if(column.type.toUpperCase() === "INT" && IsNumber(v))
					return true;
				if(column.type.toUpperCase().startsWith("VARCHAR") && IsString(v))
					return true;
				if(column.type.toUpperCase() === "STRING" && IsString(v))
					return true;
				return false;
			}
			if(column.default)
				this[`set${column.name}`](column.default)
		}
	}

	GetDDLCreateTable() {
		let ddl = `CREATE TABLE \`${MYSQL2_Config.database}\`.\`${this._tableName}\` (\n  \`Id\` INT NOT NULL AUTO_INCREMENT,\n  \`Creation\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  \`LastModified\` DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  \`RecordState\` INT NOT NULL DEFAULT 1,`
		for(let i in this._struct) {
			let info = this._struct[i]
			ddl += `\n  \`${info.name}\` ${info.type}`
			let v = info.default
			if(v === undefined) {
				// do nothing
			} else if(v === null) {
				ddl += ` DEFAULT NULL`
			} else if(IsNumber(v)) {
				ddl += ` DEFAULT ${v}`
			} else {
				ddl += ` DEFAULT '${v}'`
			}
			if(info.comment)
				ddl += ` COMMENT '${info.comment}'`
			ddl += ','
		}
		ddl += `\n  PRIMARY KEY (\`Id\`)\n)`
		return ddl
	}

	// 获取更新table结构的语句
	// 为了确保数据安全 最好不要执行此处
	// show full fields from test;
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

	async Save() {
		// if insert
		// else update
		let ddl = ''
		let params = []
		if(this.column_Id) {
			ddl = `UPDATE \`${this._tableName}\ SET `
			let columnName = []
			for(let i in this._struct) {
				let column = this._struct[i]
				if(this[`column_${column.name}_need_update`]) {
					columnName.push(column.name)
					params.push(this[`get${column.name}`]())
				}
			}
			if(columnName.length == 0)
				return
			ddl += columnName.join('=?,')
			ddl += ` WHERE Id=${this.column_Id} AND RecordState = 1`
		} else {
			ddl = `INSERT INTO \`${this._tableName}\`(`
			for(let i in this._struct) {
				let column = this._struct[i]
				ddl += `\`${column.name}\`,`
				let v = this[`get${column.name}`]()
				if(v === undefined)
					v = null
				params.push(v)
			}
			if(this._struct.length)
				ddl = ddl.Pop()
			ddl += ') VALUES('
			for(let i in this._struct)
				ddl += '?,'
			if(this._struct.length)
				ddl = ddl.Pop()
			ddl += ')'
		}
		if(ddl.length) {
			await this._mysql.Query(ddl, params)
		}
	}

	async Find(a_filters) {
		let ddl = `SELECT Id, Creation, LastModified, RecordState`
		let params = []
		for(let i in this._struct)
			ddl += `, ${this._struct[i].name}`
		ddl += ` FROM ${this._tableName} WHERE RecordState = 1`
		// console.log(ddl)
		let r = await this._mysql.Query(ddl, params)
		console.log(r.rows)
	}

	async FindOne() {

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
		let cTable = new TableUnit(a_TableName, a_Struct, this)
		this.tablesInfo[a_TableName] = cTable

		if(false)
			return
		
		// 同步表结构
		// 创建表
		let oldTableInfo = await this.Query("SELECT * FROM information_schema.columns WHERE TABLE_SCHEMA=? and TABLE_NAME=?", [MYSQL2_Config.database, a_TableName])
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
			column:[],
			msg:""				// err
		}
		if(this.ConnPool === undefined) {
			ret.msg = "ConnPool undefined"
            return ret
		}
		console.log(`do sql: ${sqlString} . ${params}`)
        const [rows, column] = await this.ConnPool.execute(sqlString, params)
        ret.column = column
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
	setTimeout(async () => {
		let m = new MYSQL2
		await m.RegistTableStruct("test", [
			{name:"int_name1", type:"int", default:"123", comment:"this is a comment"},
			{name:"int_name2", type:"int", default:null, comment:"this is a comment2"},
			{name:"var_str1", type:"varchar(255)", default:"this is a default"},
			{name:"var_str2", type:"varchar(255)", default:null},
			{name:"text_str1", type:"text", default:"this is a default"},
			{name:"text_str2", type:"text", default:null},
		])
	
		// create
		{
			let tTest = m.GetTable("test")

			tTest.Save()
		}
	
		// find
		{
			let tTest = m.GetTable("test").Find()
		}
	
		// let tTest = m.GetTable("test").FindOne({
		// 	where: {Sort: {[this.Op.lt]: 0}},
		// 	order: [ ['Sort', 'DESC']]
		// })
		// tTest.name1 = 234
		// tTest.Save()
	}, 100)
}
