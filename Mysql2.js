let mysql2 = require('mysql2/promise');
let {IsNumber, IsString, IsArray, IsObject, IsNan} = require('./easy')

// 以下四列依托数据库自动管理

const COLUMN_INNER = [
	{name:"Id", type:"INT"},
	{name:"Creation", type:"DATETIME"},
	{name:"LastModified", type:"DATETIME"},
	{name:"RecordState", type:"INT"}
]
const COLUMN_INNER_NAME = COLUMN_INNER.map(item => item.name)

class Model
{
	constructor() {
	}

	Init(a_tableName = null, a_struct = [], a_db = null) {
		this._tableName = a_tableName
		this._struct = a_struct
		this._db = a_db

		// 规范表结构
		for(let i in this._struct) {
			let colName = this._struct[i].name
			if(COLUMN_INNER.some(item => item.name === colName))
				delete this._struct[i]
			else if(colName.startsWith('_'))
				delete this._struct[i]
		}

	}

	GetDDLCreateTable() {
		let ddl = `CREATE TABLE \`${this._tableName}\` (\n  \`Id\` INT NOT NULL AUTO_INCREMENT,\n  \`Creation\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  \`LastModified\` DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n  \`RecordState\` INT NOT NULL DEFAULT 1,`
		for(let i in this._struct) {
			let info = this._struct[i]
			ddl += `\n  \`${info.name}\` ${info.type} DEFAULT NULL`
			if(info.comment)
				ddl += ` COMMENT '${info.comment}'`
			ddl += ','
		}
		ddl += `\n  PRIMARY KEY (\`Id\`)\n)`
		return ddl
	}

	Fill(a_data) {
		if(!IsObject(a_data))
			return

		// 外部调用不能设定 Id, Creation, LastModified, RecordSate
		// this._struct 中不会包含上面四项目
		for(let i in this._struct) {
			let column = this._struct[i]
			if(typeof a_data[column.name] !== "undefined") {
				this[column.name] = a_data[column.name]
				this[`need_update_${column.name}`] = false
			}
		}
	}

	_fill(a_data) {
		for(let i = 0; i < COLUMN_INNER.length; ++i) {
			let column_inner = COLUMN_INNER[i]
			let data = a_data[column_inner]
			if(data)
				this[`column_${column_inner}`] = data
		}
		for(let i in this._struct) {
			let column = this._struct[i]
			if(typeof a_data[column.name] !== "undefined") {
				this[column.name] = a_data[column.name]
				this[`need_update_${column.name}`] = false
			}
		}
	}

	// 返回新的 [model]
	async Find(query) {
		let ddl = `SELECT Id`
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
		let r = await this.query(ddl, params)
		r.models = []
		for(let i = 0; i < r.rows.length; ++i) {
			let row = r.rows[i]
			let model = new Model
			model.__proto__ = this
			model._fill(row)
			r.models.push(model)
		}
		return r
	}

	async FindOne(query = {}) {
		query.limit = 1
		if(query.order == null)
			query.order = "Id desc"
		let r = await this.Find(query)
		if(r.models.length > 0) {
			return r.models[0]
		}
		return null
	}

	async Save() {
		let columnUpdate = []		// {name, value}
		if(this.Id !== null) {
			columnUpdate.push({name:"Id", value: this.Id})
		}

		this._struct.forEach(({name, type}) => {
			columnUpdate.push({name:name, value: this[name]})
		})

		if(columnUpdate.length == 0)
			return

		// 如果是更新 则columnUpdate的第一列一定为Id
		let ddl = ''
		let params = []
		if(columnUpdate[0].name !== "Id") {
			ddl = `INSERT INTO \`${this._tableName}\`(`
			let names = []
			let ddl2 = []
			columnUpdate.forEach(({name, value}) => {
				names.push(name)
				params.push(value)
				ddl2.push('?')
			})
			ddl += `${names.join(',')}) VALUE(${ddl2.join(',')})`
		} else {
			ddl = `UPDATE \`${this._tableName}\` SET `
			let ddl2 = []
			for(let i = 1; i < columnUpdate.length; ++i) {
				ddl2.push(`\`${columnUpdate[i].name}\`=?`)
				params.push(columnUpdate[i].value)
			}
			ddl += `${ddl2.join(',')} WHERE \`Id\`=${columnUpdate[0].value}`
		}
		return await this.query(ddl, params)
	}

	async query(ddl, params) {
		if(this._db)
			return await this._db.Query(ddl, params)
		console.error(`mysql null. ddl:${ddl}. params:${JSON.stringify(params)}`)
		return null
	}

	New() {
		let obj = {}

		COLUMN_INNER.forEach(({name, type})=>{
			obj[name] = null
		})
		this._struct.forEach(({name, type}) => {
			obj[name] = null
		})

		obj.__proto__ = this
		return obj
	}
}

class MYSQL2
{
	constructor(a_config = null) {
		this._config = a_config
		this._config = IsObject(this._config) ? this._config : {}
		this._config.host = this._config.host || "127.0.0.1"
		this._config.port = this._config.port || 3306
		this._config.user = this._config.user || 'root'
		this._config.password = this._config.password || "123456"
		this._config.database = this._config.database || "test"
		
		this._ConnPool = mysql2.createPool(this._config);
		// this._Models = {}
		this.models = {}
	}
	
	Connect(a_config) {
		this.Disconnect();
		for(let k in a_config) {
			if(a_config[k]) {
				this._config[k] = a_config[k]
			}
		}
		this._ConnPool = mysql2.createPool(this._config)
	}

	Disconnect() {
		if(this._ConnPool != undefined) {
			this._ConnPool.end()
			this._ConnPool = undefined
		}
	}

	/*
	* 注册表结构
	* 创建表
	* 添加列
	* 修改类型
	* a_Struct
	*	[
	*		{ "name":"int",   "type":"INT",         }, 
	*		{ "name":"char",  "type":"VARCHAR(255)" },
	*	]
	*/
	async RegistModel(a_modelName, a_struct) {
		let model = new Model()
		model.Init(a_modelName, a_struct, this)

		// this._Models[a_modelName] = model
		this.models[a_modelName] = model

		// 添加方法获取Model
		// Object.defineProperty(this, a_modelName, {
		// 	get: function() {
		// 		return this._Models[a_modelName].New()
		// 		// let n = new Model
		// 		// n.__proto__ = this._Models[a_modelName]
		// 		// return n;
		// 	},
		// 	set: function(undefined) {
		// 		// do nothing
		// 	}
		// })

		// 创建表
		let oldTableInfo = await this.Query("SELECT * FROM information_schema.columns WHERE TABLE_SCHEMA=? and TABLE_NAME=?", [this._config.database, a_modelName])
		if(oldTableInfo.rows.length == 0) {
			let ddlCreate = model.GetDDLCreateTable();
			await this.Query(ddlCreate)
		}
	}

	async Query(sqlString, params = []) {
		let ret = {
			affectedRows : 0,	// insert update delete
			rows: [],			// select
			column:[],			// info about columns
			msg:"",				// err
		}
		if(this._ConnPool === undefined) {
			ret.msg = "ConnPool undefined"
			return ret
		}
		try {
			const [rows, column] = await this._ConnPool.execute(sqlString, params)
			ret.column = column
			ret.rows = rows
		} catch(e) {
			ret.msg = e.message
		}
		console.log(`do sql: ${sqlString} ${JSON.stringify(params)}. ${ret.msg.length ? ("ERROR " + ret.msg) : ("success")}`)
		return ret
	}
}

module.exports = {
	MYSQL2
};

if (require.main === module) {

	let db = null
	// 启动准备工作
	setTimeout(async () => {
		db = new MYSQL2()
		db.RegistModel('Test', [
			{name:"int_name1", type:"int", default:"123", comment:"this is a comment"},
			{name:"int_name2", type:"int", default:null, comment:"this is a comment2"},
			{name:"var_str1", type:"varchar(255)", default:"this is a default"},
			{name:"var_str2", type:"varchar(255)", default:null},
			{name:"text_str1", type:"text", default:"this is a default"},
			{name:"text_str2", type:"text", default:null},
		]);
		
		db.RegistModel('newTest', [
			{name:"name", type:"int", default:"123", comment:"this is a comment"},
			{name:"var",  type:"varchar(255)", default:"this is a default"},
			{name:"text", type:"text", default:null},
		]);
	},1)

	setTimeout(async () => {
		// 运行过程中的使用
		let create = db.models.Test.New()
		create.int_name1 = 1
		create.int_name2 = 2
		create.var_str1 ="var1"
		create.var_str2 = "var2"
		create.text_str1 ="text1"
		create.text_str2 = "text2"
		// console.log(create)
		await create.Save();

		let newTest = db.models.newTest.New()
		newTest.name = "name"
		newTest.var = "var"
		await newTest.Save();

		// let create2 = db.models.Test.New()
		// create2.int_name1 = 111
		// create2.int_name2 = 222
		// create2.var_str1 ="varchar str1"
		// create2.var_str2 = "varchar str2"
		// create2.text_str1 ="text str1"
		// create2.text_str2 = "text str2"
		// await create2.Save();

		// let tests = await db.models.Test.Find({
		// 	column: "int_name1 AS int_name1_new_name, int_name2 AS int_name2_new_name",
		// 	where : "Id > 0, RecordState=1, LENGTH(var_str1)>0",
		// 	order : "Id ASC, Creation ASC",
		// 	limit:100
		// })
		// tests.models[tests.models.length - 1].int_name1 = 3;
		// tests.models[tests.models.length - 1].Save()
		// console.log(tests)




		// for(let i = 0; i < tests.length; ++i) {
		// 	let t = tests[i]
		// 	t.int_name1 = 1;
		// 	t.save();
		// }

		// let test_one = await db.models.Test.FindOne({})
		// test_one.int_name1 = 1
		// test_one.Save();
	}, 200)
}
