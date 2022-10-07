/*
* todo
*	文件夹压缩失败
*/

let fs = require('fs');
let archiver = require('archiver');
let { join, sep, isAbsolute, dirname, basename } = require('path')
let { IsString, IsObject, IsArray } = require('./easy');

const config = {
	dstPwd: '/tmp/archiver'
}
// 如果默认压缩包存放路径不存在 则创建
fs.exists(`${config.dstPwd}`, exist => {
    if(!exist)
        fs.mkdir(config.dstPwd, {recursive:true}, err => {
            if (err) { return console.error(err); }
        })
    }
)

/*
* desc
*   打包压缩
*
* input
*   a_src 需要压缩的文件
*     exp "/root/text.txt"
*     exp {from: "text.txt", to: "newText.txt"}
*     exp [{from: "text.txt", to: "newText.txt"}, {from: "text.txt", to: "newText.txt"}]
*     exp "/root/folder/"	压缩文件夹 需要最后以/结尾
*     exp [{from: "text.txt", to: "newText.txt"}, {from: "/root/folder"}]
*   a_dst 压缩包名字
*   a_dstPwd 压缩包的目的路径 如果a_dst带有绝对路径 则取a_dst中路径
*   a_level 压缩等级 0不压缩 9最高压缩
* output
*   may throw err
*/
let Compress = async (a_src, a_dst, a_dstPwd = config.dstPwd, a_level = 9) => {
	// 规范化a_src => [{from, to}, {from}]
	{
		let srcNew = []
		if(IsString(a_src)) {
			srcNew = [{from: a_src}]
		} else if(IsObject(a_src)) {
			srcNew = [a_src]
		} else if(IsArray(a_src)) {
			// do nothing
			srcNew = a_src
		} else {
			throw 'Compress type a_src not RECOGNIZE'
		}
		a_src = srcNew
	}

	// 如果a_dst带有绝对路径 则重新填写a_dstPwd
	console.log(a_dst)
	if(isAbsolute(a_dst)) {
		a_dstPwd = dirname(a_dst)
		a_dst = basename(a_dst)
	}

	let output = fs.createWriteStream(join(a_dstPwd, a_dst))
	let archive = archiver('zip', {zlib: { level: a_level }});

	output.on('close', function() {
		console.debug(archive.pointer() + ' total bytes');
		console.debug('archiver has been finalized and the output file descriptor has closed.');
	})
	
	archive.on('warning', function(err) {
		console.warn(err)
	}).on('error', function(err) {
		throw err;
	});
	
	for(let i = 0; i < a_src.length; ++i) {
		let {from, to} = a_src[i]

		// if 压缩文件夹 else 压缩文件
		if(from.endsWith(sep)) {
			archive.directory(a_src)
		} else {
			archive.file( from, { name:  to||from})
		}
	}

	archive.pipe(output);

	return await archive.finalize()
}

module.exports={Compress}

if (require.main === module) {
	setTimeout(async () => {
		await Compress('/root/folder/', 'pack1.zip', '/root')	// 压缩文件夹
		await Compress('/root/config2', 'pack2.zip', '/root')	// 压缩文件
		await Compress({from:'/root/develop', to:'newDevelop.txt'}, 'pack3.zip', '/root')	// 压缩文件
		await Compress([
			{from:'/root/folder'},
			{from:'/root/develop'},
			{from:'/root/develop', to:'newDebug.txt'},
			{from:'/root/out.log', to:'newOut.log'}
		], 'pack4.zip', '/root')// 混压
		await Compress('/root/upload/out.log', '/root/pack5.zip')
	}, 100);
}