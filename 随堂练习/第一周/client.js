var net = require("net")

class Request {
    constructor(options) {
        this.method = options.method || 'GET'
        this.host = options.host
        this.port = options.port || 80
        this.path = options.path || '/'
        this.body = options.body || {}
        this.header = options.header || {}

        if (this.method === 'POST' && !this.header['Content-Type']) {
            this.header["Content-Type"] = "application/json"
        }else if (this.method === 'GET' && !this.header['Content-Type']) {
            this.header["Content-Type"] = "application/x-www-form-urlencoded"
        }

        if (this.header["Content-Type"] === "application/json" ) {
            this.bodyText = JSON.stringify(this.body)
        }else if (this.header["Content-Type"] === "application/x-www-form-urlencoded" ) {
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&')
        }

        this.header["Content-Length"] = this.bodyText.length
    }

    send(connection) {
        return new Promise((resolve, reject) => {
            const parser = new ResponseParser()
            if (connection) {
                connection.write(this.toString())
            }else {
                connection = net.createConnection({
                    host: this.host,
                    port: this.port
                }, () => {
                    connection.write(this.toString())
                })
            }

            connection.on('data', (data) => {
                console.log('connection respone data:\n', data.toString())
                parser.receive(data.toString())
                if (parser.isFinished) {
                    resolve(parser.response)
                    connection.end()
                }
            }).on('error', (err) => {

            })
        })
    }

    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r\n${Object.keys(this.header).map(key => `${key}: ${this.header[key]}`).join('\r\n')}\r\n\r\n${this.bodyText}`
    }
}

class ResponseParser {
    constructor() {
        this.WATTING_STATUS_LINE = 0
        this.WATTING_STATUS_LINE_END = 1
        this.WATTING_HEADER_NAME = 2
        this.WATTING_HEADER_SPACE = 3
        this.WATTING_HEADER_VALUE = 4
        this.WATTING_HEADER_LINE_END = 5
        this.WATTING_HEADER_BLOCK_END = 6
        this.WATTING_BODY = 7

        this.current = this.WATTING_STATUS_LINE
        this.statusLine = ''
        this.headers = {}
        this.headerName = ''
        this.headerValue = ''
        this.bodyParser = null
    }

    receive(string) {
        for (const c of string) {
            this.receiveChar(c)
        }
    }

    receiveChar(char) {
        if (this.current === this.WATTING_STATUS_LINE) {
            if (char === '\r') {
                this.current = this.WATTING_STATUS_LINE_END
            } else {
                this.statusLine += char
            }
        }else if (this.current === this.WATTING_STATUS_LINE_END) {
            if (char === '\n') {
                this.current = this.WATTING_HEADER_NAME
            }
        }else if (this.current === this.WATTING_HEADER_NAME) {
            if(char === ':') {
                this.current = this.WATTING_HEADER_SPACE
            }else if (char === '\r') {
                this.current = this.WATTING_HEADER_BLOCK_END
                if(this.headers['Transfer-Encoding'] === 'chunked') {
                    this.bodyParser = new ChunkedBodyParser()
                }
            }else {
                this.headerName += char
            }
        }else if (this.current === this.WATTING_HEADER_SPACE) {
            if (char === ' ') {
                this.current = this.WATTING_HEADER_VALUE
            }
        }else if (this.current === this.WATTING_HEADER_VALUE) {
            if (char === '\r') {
                this.current = this.WATTING_HEADER_LINE_END
                this.headers[this.headerName] = this.headerValue
                this.headerName = ''
                this.headerValue = ''
            }else {
                this.headerValue += char
            }
        }else if (this.current === this.WATTING_HEADER_LINE_END) {
            if(char === '\n') {
                this.current = this.WATTING_HEADER_NAME
            }
        }else if (this.current === this.WATTING_HEADER_BLOCK_END) {
            if(char === '\n') {
                this.current = this.WATTING_BODY
            }
        }else if(this.current === this.WATTING_BODY) {
            this.bodyParser.receiveChar(char)
        }
    }

    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished
    }

    get response() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/)
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.$2,
            headers: this.headers,
            body: this.bodyParser.content.join('')
        }
    }
}

// 示例response
// HTTP/1.1 200 OK
// Content-Type: text/html
// Date: Sun, 18 Apr 2021 13:25:33 GMT
// Connection: keep-alive
// Transfer-Encoding: chunked
//
// c
// hello world
//
// 0
class ChunkedBodyParser {
    constructor() {
        this.WATTING_LENGTH = 0
        this.WATTING_LENGTH_LINE_END = 1
        this.READING_CHUNK = 2
        this.WATTING_NEW_LINE = 3
        this.WATTING_NEW_LINE_END = 4
        this.length = 0
        this.content = []
        this.isFinished = false
        this.current = this.WATTING_LENGTH
    }

    receiveChar(char) {
        if (this.current === this.WATTING_LENGTH) {
            if(char === '\r') {
                if(this.length === 0) {
                    this.isFinished = true
                    return //直接return，不然会多读一行空行
                }
                this.current = this.WATTING_LENGTH_LINE_END
            }else {
                this.length << 4 //挪个位置
                this.length += parseInt(char,16)
            }
        }else if (this.current === this.WATTING_LENGTH_LINE_END) {
            if(char === '\n') {
                this.current = this.READING_CHUNK
            }
        }else if (this.current === this.READING_CHUNK) {
            this.content.push(char)
            this.length -- 
            if (this.length === 0) {
                this.current = this.WATTING_NEW_LINE
            }
        }else if (this.current === this.WATTING_NEW_LINE) {
            if (char === '\r') {
                this.current = this.WATTING_NEW_LINE_END
            }
        }else if (this.current === this.WATTING_NEW_LINE_END) {
            if (char === '\n') {
                // 完成一次读取，等待下一次读取，最后的空行和0不要它了
                this.current = this.WATTING_LENGTH
            }
        }
    }
}

let req = new Request({
    host: '127.0.0.1',
    port: 8888,
    body: {
        name: '我的'
    }
})

req.send()

console.log('111')

