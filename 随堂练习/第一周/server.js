var http=require('http');
 
//创建服务器
http.createServer(function(request,response) {
    let body = []
    request.on('error', (err) => {
        console.log(err)
    }).on('data',(chunk) => {
        body.push(chunk)
    }).on('end', () => {
        body = Buffer.concat(body).toString()
        console.log('body:',body)
        response.writeHead(200, {'Content-Type': 'text/html'})
        response.end('hello world\n')
    })
}).listen(8888);