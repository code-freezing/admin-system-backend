const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const multer = require('multer')
const Joi = require('joi')
const { expressjwt: jwt } = require('express-jwt')

const jwtconfig = require('./jwt_config/index.js')
const { loadAccessContext } = require('./middleware/access')
const { bootstrapFileUpload } = require('./services/file_upload_bootstrap')
const { bootstrapPerformance } = require('./services/performance_bootstrap')
const { bootstrapRbac } = require('./services/rbac_bootstrap')

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
// 统一发送错误结果，避免不同分支各自拼接响应结构。
const sendError = (res, status, message) => res.status(status).send({ status, message })

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
app.use(
  express.static('./public', {
    etag: true,
    lastModified: true,
    maxAge: '1d',
  })
)

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
// 只有登录、注册、刷新、退出以及找回密码接口不需要 access token。
app.use(
  jwt({
    secret: jwtconfig.accessTokenSecretKey,
    algorithms: ['HS256'],
  }).unless({
    path: [
      '/api/register',
      '/api/login',
      '/api/refresh',
      '/api/logout',
      '/user/verifyAccountAndEmail',
      '/user/changePasswordInLogin',
    ],
  })
)

// JWT 通过后，把用户角色、权限码和可见菜单装到请求上下文里。
app.use(loadAccessContext)

// 这里把不同业务模块挂到不同的路径前缀，便于按模块拆分文件。
app.use('/api', loginRouter)
// 挂载用户相关路由，让这一类接口统一从对应模块进入。
app.use('/user', userRouter)
// 挂载当前模块相关路由，让这一类接口统一从对应模块进入。
app.use('/set', setRouter)
// 挂载产品相关路由，让这一类接口统一从对应模块进入。
app.use('/pro', productRouter)
// 挂载消息相关路由，让这一类接口统一从对应模块进入。
app.use('/msg', messageRouter)
// 挂载文件相关路由，让这一类接口统一从对应模块进入。
app.use('/file', fileRouter)
// 挂载登录日志相关路由，让这一类接口统一从对应模块进入。
app.use('/llog', loginLogRouter)
// 挂载日志相关路由，让这一类接口统一从对应模块进入。
app.use('/olog', operationLogRouter)
// 挂载概览数据日志相关路由，让这一类接口统一从对应模块进入。
app.use('/ov', overviewLogRouter)
// 挂载消息相关路由，让这一类接口统一从对应模块进入。
app.use('/dm', depMsgRouter)

// 统一兜底处理参数校验错误、JWT 鉴权错误和未捕获异常。
app.use((err, req, res) => {
  if (err instanceof Joi.ValidationError) {
    return sendError(res, 400, '输入的数据不符合验证规则')
  }

  if (err.name === 'UnauthorizedError') {
    return sendError(res, 401, '无效的 Token')
  }

  return sendError(res, 500, err.message || '未知错误')
})

bootstrapRbac()
  .then(() => bootstrapFileUpload())
  .then(() => bootstrapPerformance())
  .then(() => {
    // 完成全部初始化后再启动服务，避免未准备好的模块提前对外响应。
    app.listen(3007, () => {
      console.log('http://127.0.0.1:3007')
    })
  })
  .catch((error) => {
    console.error('服务初始化失败：', error)
    process.exit(1)
  })
