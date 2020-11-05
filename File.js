
function WriteFile(a_file, content) {
	fs.writeFileSync(a_file, content)
}

module.exports={WriteFile}
