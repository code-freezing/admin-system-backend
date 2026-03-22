const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const multer = require('multer')
const Joi = require('joi')
const { expressjwt: jwt } = require('express-jwt')

const jwtconfig = require('./jwt_config/index.js')

const loginRouter = require('./router/login')
const userRouter = require('./router/userinfo.js')
const setRouter = require('./router/setting.js')
const productRouter = require('./router/product.js')
const messageRouter = require('./router/message.js')
const fileRouter = require('./router/file.js')
const loginLogRouter = require('./router/login_log.js')
const operationLogRouter = require('./router/operation_log.js')
const overviewLogRouter = require('./router/overview.js')
const depMsgRouter = require('./router/department_msg.js')

const app = express()

// 当前项目没有额外引入 cookie-parser，这里自己做一个最小版 Cookie 解析。
const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((cookies, chunk) => {
    const [rawKey, ...rest] = chunk.split('=')
    const key = rawKey?.trim()

    if (!key) {
      return cookies
    }

    cookies[key] = decodeURIComponent(rest.join('=').trim())
    return cookies
  }, {})
}

// 允许跨域，并允许浏览器在跨域请求时自动带上 HttpOnly Cookie。
app.use(
  cors({
    origin: true,
    credentials: true,
  })
)

// 统一解析普通表单和 JSON 请求体。
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// 上传接口使用 multipart/form-data，这里统一把文件解析到 req.files。
const upload = multer({ dest: './public/upload' })
app.use(upload.any())

// public 目录既存放上传文件，也直接对外提供静态访问。
app.use(express.static('./public'))

// refresh token 放在 HttpOnly Cookie 里，进入业务前先把 Cookie 解析出来。
app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie)
  next()
})

// res.cc 是项目里统一的错误返回助手，业务层可以少写重复样板代码。
app.use((req, res, next) => {
  res.cc = (err, status = 1) => {
    res.send({
      status,
      message: err instanceof Error ? err.message : err,
    })
  }
  next()
})

// JWT 中间件只校验 access token。
// /api 下的认证接口、找回密码接口不需要先登录，所以要放行。
app.use(
  jwt({
    secret: jwtconfig.accessTokenSecretKey,
    algorithms: ['HS256'],
  }).unless({
    path: [/^\/api\//, /^\/user\/verifyAccountAndEmail$/, /^\/user\/changePasswordInLogin$/],
  })
)

// 这里把不同业务模块挂到不同的路径前缀，便于按模块拆分文件。
app.use('/api', loginRouter)
app.use('/user', userRouter)
app.use('/set', setRouter)
app.use('/pro', productRouter)
app.use('/msg', messageRouter)
app.use('/file', fileRouter)
app.use('/llog', loginLogRouter)
app.use('/olog', operationLogRouter)
app.use('/ov', overviewLogRouter)
app.use('/dm', depMsgRouter)

// 统一兜底处理参数校验错误、JWT 鉴权错误和未捕获异常。
app.use((err, req, res, next) => {
  if (err instanceof Joi.ValidationError) {
    return res.status(400).send({
      status: 1,
      message: '输入的数据不符合验证规则',
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({
      status: 401,
      message: '无效的 Token',
    })
  }

  return res.status(500).send({
    status: 500,
    message: err.message || '未知错误',
  })
})

app.listen(3007, () => {
  console.log('http://127.0.0.1:3007')
})
