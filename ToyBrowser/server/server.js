var http=require('http');
var fs = require('fs')
 
//创建服务器
http.createServer(function(request,response) {
    let body = []
    request.on('error', (err) => {
        console.log(err)
    }).on('data',(chunk) => {
        body.push(chunk)
    }).on('end', () => {
        body = Buffer.concat(body).toString()
        if (request.url === '/index.html') {
            response.writeHead(200, {'Content-Type': 'text/html'})
            response.end(fs.readFileSync('./demo.html'))
        }else {
            response.writeHead(200, {'Content-Type': 'text/html'})
            response.end('hello world\n')
        }
    })
}).listen(8888);