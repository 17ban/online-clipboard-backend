const http = require('http')

const moment = require('moment')
function log(...msg) {
    let time = moment().format('YYYY/M/D H:mm:ss')
    console.log(`[${time}]`, ...msg)
}


// 引入 koa app 实例
const app =  require('../src/app')


// 处理启动参数
let httpPort = null
let httpsPort = null
let args = process.argv.splice(2)
for(let i = 0; i < args.length; i++) {
    let arg = args[i]
    if(arg === '--http') {
        httpPort = args[++i]
    } else if(arg === '--https') {
        httpsPort = args[++i]
    }
}


// 启动 http 服务
if(httpPort) {
    const httpServer = http.createServer(app.callback())
    httpServer.listen(httpPort)
    log(`HTTP service listening on Port:${httpPort}.`)
}


// 启动 https 服务
if(httpsPort) {
    log(`HTTPS service listening on Port:${httpsPort}.`)
}


// 捕获意料之外的异常
process.on('uncaughtException', err => {
    log(err)
})