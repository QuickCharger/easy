function init(a_path,a_contentLength){
    let ret = {
        port:1111,
        host:"ip",
        path:a_path,
        method:'POST',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded',
            'Content-Length':a_contentLength,
        }
    }

    ret.host=ret.host?ret.host:"127.0.0.1"

    return ret;
}

function HttpRequest(a_path, a_content, cb) {
    let content = querystring.stringify(a_content);
    let options = init(a_path, content.length);

    let req = http.request(options, function(res){
        res.setEncoding('utf8');
        res.on('data',function(data){
            if(cb)
                cb(data)
        });
    });

    req.on('error', function(err){
        console.log(a_path + " " + err.message)
    })

    req.write(content)
    req.end;
}

module.exports={HttpRequest}
