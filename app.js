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

// 允许跨域请求，并允许浏览器携带 HttpOnly Cookie。
app.use(
  cors({
    origin: true,
    credentials: true,
  })
)

// 统一解析请求体。
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// 解析 multipart/form-data，上传接口会使用 req.files。
const upload = multer({ dest: './public/upload' })
app.use(upload.any())

// 将 public 目录作为静态资源目录。
app.use(express.static('./public'))

// 提前解析 Cookie，refresh 接口会从 HttpOnly Cookie 中读取 refresh token。
app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie)
  next()
})

// 给每个请求挂载统一错误返回方法，便于业务层直接调用 res.cc。
app.use((req, res, next) => {
  res.cc = (err, status = 1) => {
    res.send({
      status,
      message: err instanceof Error ? err.message : err,
    })
  }
  next()
})

// 开启 JWT 鉴权，并放行登录与忘记密码相关接口。
app.use(
  jwt({
    secret: jwtconfig.accessTokenSecretKey,
    algorithms: ['HS256'],
  }).unless({
    path: [/^\/api\//, /^\/user\/verifyAccountAndEmail$/, /^\/user\/changePasswordInLogin$/],
  })
)

// 注册业务路由。
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

// 统一处理参数校验和鉴权错误，其它错误走兜底分支。
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
