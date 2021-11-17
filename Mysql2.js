let mysql2 = require('mysql2/promise');
let {IsNumber, IsString, IsArray, IsObject} = require('./easy')
// require('./String.js')

const MYSQL2_Config = {
	host : '127.0.0.1',
	port : 3306,
	user : 'root',
	password : '123456',
	database : 'test',
}

class Model
{
	constructor(a_Struct, a_TableUnit, a_data = {}) {
		this.tableUnit = a_TableUnit
		this._struct = a_Struct

		// 以下四列依托数据库自动管理
		this.column_Id = null
		this.column_Creation = null
		this.column_LastModified = null
		this.column_RecordState = null

		// 每列都设定一个变量一个相应的函数
		// column_ColumnName
		// need_update_ColumnName() 标记ColumnName是否需要更新
		for(let i in this._struct) {
			let column = this._struct[i]
			if(["Id", "Creation", "LastModified", "RecordState"].includes(column.name))
				continue
			Object.defineProperty(this, column.name, {
				get: function() {
					return this[`column_${column.name}`]
				},
				set: function(a_v) {
					this[`column_${column.name}`] = a_v
					this[`need_update_${column.name}`] = true
				}
			})
			if(column.default)
				this[column.name] = column.default
		}

		// 设定a_data
		if(IsObject(a_data)) {
			if(typeof a_data['Id'] !== "undefined")
				this.column_Id = a_data['Id']
			if(typeof a_data['Creation'] !== "undefined")
				this.column_Creation = a_data['Creation']
			if(typeof a_data['LastModified'] !== "undefined")
				this.column_LastModified = a_data['LastModified']
			if(typeof a_data['RecordState'] !== "undefined")
				this.column_RecordState = a_data['RecordState']
			for(let i in this._struct) {
				let column = this._struct[i]
				if(typeof a_data[column.name] !== "undefined") {
					this[column.name] = a_data[column.name]
					this[`need_update_${column.name}`] = false
				}
			}
		}
	}

	async Save() {
		let params = []		// {name, value}
		if(this.column_Id !== null) {
			params.push({name:"Id", value: this.column_Id})
		}
		let canSave =false
		for(let i in this._struct) {
			let column = this._struct[i]
			if(this[`need_update_${column.name}`]) {
				params.push({name:column.name, value: this[`column_${column.name}`]})
				canSave = true
			}
		}
		if(canSave)
			return await this.tableUnit.save(params)
		return {}
	}
}

class TableUnit
{
	constructor(a_TableName, a_Struct, a_Mysql) {
		this._tableName = a_TableName
		this._struct = a_Struct
		this._mysql = a_Mysql

		// fix
		for(let i in this._struct) {
			let column = this._struct[i]
			if(column.type.toUpperCase() === "INT") {
				column.default = +column.default || null
			} else if(column.type.toUpperCase() === "TEXT") {	// BLOB, TEXT, GEOMETRY or JSON can't have a default value
				column.default = undefined
			}
		}
	}

	New(a_data) {
		return new Model(this._struct, this, a_data)
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

	// 如果是更新 则a_p的第一列一定为Id
	async save(a_p = []) {
		if(!IsArray(a_p) || a_p.length == 0)
			return false
		let ddl = ''
		let params = []
		if(a_p[0].name !== "Id") {
			ddl = `INSERT INTO \`${this._tableName}\`(`
			let names = []
			let ddl2 = []
			a_p.forEach(({name, value}) => {
				names.push(name)
				params.push(value)
				ddl2.push('?')
			})
			ddl += `${names.join(',')}) VALUE(${ddl2.join(',')})`
		} else {
			ddl = `UPDATE \`${this._tableName}\` SET `
			let names = []
			let ddl2 = []
			for(let i = 1; i < a_p.length; ++i) {
				ddl2.push(`\`${a_p[i].name}\`=?`)
				params.push(a_p[i].value)
			}
			ddl += `${ddl2.join(',')} WHERE \`Id\`=${a_p[0].value}`
		}
		return await this._mysql.Query(ddl, params)
	}

	async Find(query) {
		let ddl = `SELECT Id, Creation, LastModified, RecordState`
		let params = []
		for(let i in this._struct)
			ddl += `, ${this._struct[i].name}`
			
		if(query.column) {
			let columns = query.column
			if(IsString(columns))
				columns = columns.split(',')
			for(let i in columns) {
				let c = columns[i]
				if(IsString(c)) {
					ddl += `, ${c}`
				} else {
					if(c.rename)
						ddl += `, ${c.name} AS ${c.rename}`
					else
						ddl += `, ${c.name}`
				}
			}
		}
		ddl += ` FROM ${this._tableName} WHERE RecordState = 1`
		if(query.where) {
			let wheres = query.where
			if(IsString(wheres))
				wheres = query.where.split(',')
			for(let i in wheres) {
				let w = wheres[i]
				if(IsString(w)) {
					ddl += ` AND ${w}`
				} else {
					if(IsNumber(w.value))
						ddl += ` AND ${w.name} ${w.exp} ${w.value}`
					else if(IsString(w.value))
						ddl += ` AND ${w.name} ${w.exp} '${w.value}'`
					else if(w.value === null)
						ddl += ` AND ${w.name} ${w.exp} NULL`
				}
			}
		}
		if(query.order) {
			let orders = query.order
			if(IsString(query.order))
				orders = query.order.split(',')
			let orderArray = []
			for(let i in orders) {
				let o = orders[i]
				if(IsString(o)) {
					orderArray.push(o)
				} else {
					if(o.desc === true || o.desc === "true" || o.desc === 1 || o.asc === false || o.asc === "false" || o.asc === 0)
						orderArray.push(`${o.name} DESC`)
					else
						orderArray.push(`${o.name} ASC`)
				}
			}
			ddl += ` ORDER BY ${orderArray.join(',')}`
		}
		if(query.limit) {
			if(IsNumber(query.limit))
				ddl += ` LIMIT ${query.limit}`
			else if(IsString(query.limit))
				ddl += ` LIMIT ${query.limit}`
			else if(IsObject(query.limit) && IsNumber(query.limit.begin) && IsNumber(query.limit.count))
				ddl += ` LIMIT ${query.limit.begin},${query.limit.count}`
		}
		let r = await this._mysql.Query(ddl, params)
		r.models = []
		for(let i = 0; i < r.rows.length; ++i) {
			let row = r.rows[i]
			r.models.push(this.New(row))
		}
		return r
	}

	async FindOne(query) {
		query.limit = 1
		if(query.order == null)
			query.order = "Id desc"
		let r = await this.Find(query)
		if(r.models.length > 0)
			return r.models[0]
		return {}
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
		console.log(`do sql: ${sqlString}. ${params}`)
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
		let db = new MYSQL2()
		await db.RegistTableStruct("test", [
			{name:"int_name1", type:"int", default:"123", comment:"this is a comment"},
			{name:"int_name2", type:"int", default:null, comment:"this is a comment2"},
			{name:"var_str1", type:"varchar(255)", default:"this is a default"},
			{name:"var_str2", type:"varchar(255)", default:null},
			{name:"text_str1", type:"text", default:"this is a default"},
			{name:"text_str2", type:"text", default:null},
		])
	
		// create
		{
			let tTest = db.GetTable("test").New()
			tTest.int_name1 = 111
			tTest.int_name2 = 222
			tTest.var_str1 ="varchar str1"
			tTest.var_str2 = "varchar str2"
			tTest.text_str1 ="text str1"
			tTest.text_str2 = "text str2"
			// tTest.Save()
			
			let tTest2 = db.GetTable("test").New()
			// tTest2.Save()
		}

		// find
		{
			// let find1 = await db.GetTable("test").Find({
			// 	column: "int_name1 AS int_name1_new_name, int_name2 AS int_name2_new_name",
			// 	where : "Id > 0, RecordState=1, LENGTH(var_str1)>0",
			// 	order : "Id ASC, Creation ASC",
			// 	limit:100
			// })
			// console.log(find1)

			let findone = await db.GetTable("test").FindOne({
				column: "int_name1 AS int_name1_new_name, int_name2 AS int_name2_new_name",
				where : "Id > 0, RecordState=1, LENGTH(var_str1)>0",
				order : "Id ASC, Creation ASC",
				limit:100
			})
			findone.int_name1 = 987654321
			findone.Save()
			console.log(findone)
		}

		// // v2 model放到实际的类中
		// {
		// 	let newTest = models.Test.New()
		// 	newTest.int_name1 = 111
		// 	newTest.int_name2 = 222
		// 	newTest.var_str1 ="varchar str1"
		// 	newTest.var_str2 = "varchar str2"
		// 	newTest.text_str1 ="text str1"
		// 	newTest.text_str2 = "text str2"
		// 	newTest.Save()

		// 	let findTest = model.Test.FindOne({
		// 		column: "int_name1 AS int_name1_new_name, int_name2 AS int_name2_new_name",
		// 		where : "Id > 0, RecordState=1, LENGTH(var_str1)>0",
		// 		order : "Id ASC, Creation ASC",
		// 	})
		// 	if(findTest) {
		// 		findTest.int_name1 = 987654321
		// 		findTest.Save()
		// 	}
		// }

		// 	let find2 = await m.GetTable("test").Find({
		// 		column:[
		// 			{name:"int_name1", rename:"int_name1_new_name"},
		// 			{name:"int_name2", rename:"int_name2_new_name"},
		// 		],
		// 		where : [
		// 			{name:"Id", exp:">", value:0},
		// 			{name:"RecordState", exp:"=", value:1},
		// 			{name:"var_str1", exp:"is not", value:null},
		// 			{name:"LENGTH(var_str1)", exp:">", value:0}
		// 		],
		// 		order : [
		// 			{name:"Id", desc:1}
		// 		],
		// 		limit:100
		// 	})
		// 	console.log(find2)

		// 	let findone = await m.GetTable("test").FindOne({
		// 		column: "int_name1 as int_name1_new_name, int_name2 as int_name2_new_name",
		// 		where : "Id > 0, RecordState=1, LENGTH(var_str1)>0",
		// 	})
		// 	console.log(findone)

		// 	findone.setint_name2(1234)
		// 	findone.Save()
		// }

		// let tTest = m.GetTable("test").FindOne({
		// 	where: {Sort: {[this.Op.lt]: 0}},
		// 	order: [ ['Sort', 'DESC']]
		// })
		// tTest.name1 = 234
		// tTest.Save()
	}, 100)
}
