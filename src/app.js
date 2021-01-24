const koa = require('koa')

const CryptoJS = require("crypto-js")
function hash(data, salt) {
    let hashArr = CryptoJS.MD5(salt + data + salt)
    let hashStr = hashArr.words[0]
        .toString(32)
        .slice(1, 5)
        .toUpperCase()
    return hashStr
        .replace(/I/g, 'W')
        .replace(/O/g, 'X')
}

function match(ctx, method, path) {
    return (ctx.method === method && ctx.path === path)
}


// 全局常量
const maxTimeout = 10 * 60 * 1000
const maxTextAmount = 100_000
const maxTextLength = 10_000
const status = {
    OK: 'OK',
    FAIL: 'FAIL',
    ERROR: 'ERROR',
    REJECT: 'REJECT'
}


// 全局状态
const textMap = {
    _map: new Map(),
    totalTextAmount: 0,
    totalTextLength: 0,
    get(key) {
        return this._map.get(key)
    },
    has(key) {
        return this._map.has(key)
    },

    set(key, text) {
        if(this.has(key)) {
            return false
        }
        this._map.set(key, text)
        this.totalTextAmount += 1
        this.totalTextLength += text.length
        return true
    },
    delete(key) {
        let text = this.get(key)
        if(text !== undefined) {
            this.totalTextAmount -= 1
            this.totalTextLength -= text.length
            return this._map.delete(key)
        }
        return false
    }
}


// 实例化 koa app
const app = new koa()


// 压缩
app.use(require('koa-compress')())


// 解析请求的body
app.use(require('koa-bodyparser')())


// 允许跨域
app.use(async (ctx, next) => {
    ctx.set({
        'Access-Control-Allow-Origin': '*'
    })
    await next()
})


// 存
app.use(async (ctx, next) => {
    if(!match(ctx, 'POST', '/api/text')) {
        await next()
        return
    }

    // 检查是否已经满载
    if(textMap.totalTextAmount >= maxTextAmount) {
        ctx.status = 503
        ctx.body = {
            status: status.REJECT,
            msg: 'The amount of text in server reaches the maximum.'
        }
        return
    }

    // 读取文本并检查是否超出字符数限制
    let text = ctx.request?.body?.text
    if(text.length > maxTextLength) {
        ctx.status = 403
        ctx.body = {
            status: status.REJECT,
            msg: 'Exceeds the limitation of text length.'
        }
        return
    }

    // 读取超时时间
    let timeout = ctx.request?.body?.timeout ?? maxTimeout
    if(timeout > maxTimeout) {
        timeout = maxTimeout
    }

    // 尝试存入
    let salt = Date.now().toString()
    let retry = 0
    for(; retry < 16; retry++) {
        let key = hash(text, salt)
        if(textMap.set(key, text)) {
            setTimeout(() => {
                textMap.delete(key)
            }, timeout)
            ctx.body = {
                status: status.OK,
                msg: 'Succeed.',
                key,
                exp: Date.now() + timeout
            }
            break
        }
        salt += key
    }

    // 检查是否成功存入
    if(retry === 16) {
        ctx.status = 500
        ctx.body = {
            status: status.ERROR,
            msg: 'Service error.'
        }
    }
})


// 取
app.use(async (ctx, next) => {
    if(!match(ctx, 'GET', '/api/text')) {
        await next()
        return
    }
    let key = ctx.query?.key?.toUpperCase()
    let text = textMap.get(key)
    if(text) {
        ctx.body = {
            status: status.OK,
            msg: 'Succeed.',
            text
        }
    } else {
        ctx.status = 404
        ctx.body = {
            status: status.FAIL,
            msg: `Can't find any text by "${key}"`
        }
    }
})


// 删除
app.use(async (ctx, next) => {
    if(!match(ctx, 'DELETE', '/api/text')) {
        await next()
        return
    }
    let key = ctx.query?.key?.toUpperCase()
    let isDeleted = textMap.delete(key)
    if(isDeleted) {
        ctx.body = {
            status: status.OK,
            msg: 'Succeed.'
        }
    } else {
        ctx.status = 404
        ctx.body = {
            status: status.FAIL,
            msg: `Can't find any text by "${key}"`
        }
    }
})


// 查询服务器状态
app.use(async (ctx, next) => {
    if(!match(ctx, 'GET', '/api/status')) {
        await next()
        return
    }
    ctx.body = {
        status: status.OK,
        msg: 'Succeed.',
        maxTimeout,
        maxTextAmount,
        totalTextAmount: textMap.totalTextAmount,
        totalTextLength: textMap.totalTextLength
    }
})


// 400
app.use(async ctx => {
    ctx.status = 400
    ctx.body = {
        status: status.ERROR,
        msg: 'Bad Request.'
    }
})


// 导出 koa 实例
module.exports = app