// 引入 koa app 实例
const app =  require('./app')

// 处理启动参数
let httpPort, httpsPort, sslCertPath, sslKeyPath
let args = process.argv.splice(2)
for(let i = 0; i < args.length; i++) {
    let arg = args[i]
    if(arg === '--http') {
        httpPort = args[++i]
    } else if(arg === '--https') {
        httpsPort = args[++i]
        sslCertPath = args[++i]
        sslKeyPath = args[++i]
    }
}

// 启动 https 服务
if(httpsPort) {
    if(!(sslCertPath && sslKeyPath)) {
        throw new Error(`Can't start HTTPS service without SSL certificate or private key.`)
    }
    const https = require('https')
    const fs = require('fs')
    const httpsServer = https.createServer({
        allowHTTP1: true,
        cert: fs.readFileSync(sslCertPath),
        key: fs.readFileSync(sslKeyPath)
    }, app.callback())
    httpsServer.listen(httpsPort)
    console.log(`HTTPS service listening on Port:${httpsPort}.`)
}

// 启动 http 服务
if(httpPort || (!httpPort && !httpsPort)) {
    const http = require('http')
    const httpServer = http.createServer(app.callback())
    httpServer.listen(httpPort || 80)
    console.log(`HTTP service listening on Port:${httpPort || 80}.`)
}

// 捕获意料之外的异常
process.on('uncaughtException', err => {
    console.log(err)
})