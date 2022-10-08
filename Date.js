Date.prototype.Format = function (fmt = "yyyy_MM_dd hh:mm:ss") {
	var o = {
		"M+": this.getMonth() + 1, //月份 
		"d+": this.getDate(), //日 
		"h+": this.getHours(), //小时 
		"m+": this.getMinutes(), //分 
		"s+": this.getSeconds(), //秒 
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度 
		"S": this.getMilliseconds() //毫秒 
	};
	if (/(y+)/.test(fmt))
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
		if (new RegExp("(" + k + ")").test(fmt))
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

Date.prototype.now = (format = "yyyy_MM_dd hh:mm:ss") => new Date().Format(format)

/*
* desc
*   转换时间到指定时区 转换后的时间 使用toLocaleString获取时间 
*   (null, -5)  转换当前时区的时间到多伦多时区(西五区)
*   ('2021-08-31T13:38:00', -5, +9)  东京时间(东九区)2020-01-31T13:38:00转换到多伦多时区
*
* input
*   a_DateTime 格式如 '2021-08-31T13:38:00' 当作0时区时间
*   a_DstTimeZone 要转换到的时区 默认当前时区
*   a_SrcTimeZone a_DateTime的时区 默认当前时区
*
* ISO8601  2021-08-31T13:38:00+08:00
*/
Date.prototype.ToTimeZone = (a_DateTime = null, a_DstTimeZone = null, a_SrcTimeZone = null) => {
	let localTimeZone = 0- new Date().getTimezoneOffset() / 60
	a_DstTimeZone = a_DstTimeZone === null ? localTimeZone : a_DstTimeZone
	a_SrcTimeZone = a_SrcTimeZone === null ? localTimeZone : a_SrcTimeZone

	// new Date("2020-08-30") 当前时间为 0时区的00:00:00
	// new Date("2020-08-30 00:00:00") 当前时间为 当前时区的00:00:00
	// 所以此处统一加上时间
	if(a_DateTime && a_DateTime.length == 10)
		a_DateTime += " 00:00:00"
	let sec = a_DateTime === null ? new Date().getTime() : new Date(a_DateTime).getTime()
	let ret = new Date()
	ret.setTime(sec  + (a_DstTimeZone - a_SrcTimeZone) * 3600 * 1000)
	return ret
}

if (require.main === module) {
	console.log(`current DateTime ${new Date().now()}`)
	
	let GUESS = (obj, guess) => {
		let r = new Date().ToTimeZone(...obj)
		console.log(`${r.toLocaleString()} ${guess} ${r.toLocaleString() == guess}`)
	}

	GUESS(["2021-08-31"], "2021/8/31 00:00:00")
	GUESS(["2021-08-31", 0], "2021/8/30 16:00:00")
	GUESS(["2021-08-31 00:00:00", 0, +8], "2021/8/30 16:00:00")
	GUESS(["2021-08-31 18:02:03", -5, 8], "2021/8/31 05:02:03")
}
