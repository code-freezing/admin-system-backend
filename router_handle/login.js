const db = require('../db/index.js')
const bcrypt = require('bcrypt')
const jwtconfig = require('../jwt_config')
const {
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
} = require('../services/token')

const REFRESH_COOKIE_NAME = 'refreshToken'

// 这个文件既处理账号登录，也负责双 token 的刷新与注销。
const query = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        reject(err)
        return
      }

      resolve(results)
    })
  })

const parseExpiresInToMs = (value) => {
  const match = String(value)
    .trim()
    .match(/^(\d+)([smhd])$/i)

  if (!match) {
    throw new Error('不支持的 token 过期配置')
  }

  const amount = Number(match[1])
  const unit = match[2].toLowerCase()

  if (unit === 's') return amount * 1000
  if (unit === 'm') return amount * 60 * 1000
  if (unit === 'h') return amount * 60 * 60 * 1000
  return amount * 24 * 60 * 60 * 1000
}

// refresh token 放到 HttpOnly Cookie，浏览器会自动带上，前端 JS 读不到它。
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
  maxAge: parseExpiresInToMs(jwtconfig.refreshTokenExpiresIn),
})

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  })
}

const findUserByAccount = (account) => query('select * from users where account = ?', [account])

const findUserById = (id) => query('select * from users where id = ?', [id])

exports.register = async (req, res) => {
  const regInfo = req.body

  if (!regInfo.account || !regInfo.password) {
    return res.send({
      status: 1,
      message: '账号或密码不能为空',
    })
  }

  try {
    const results = await query('select * from users where account = ?', [regInfo.account])

    if (results.length > 0) {
      return res.send({
        status: 1,
        message: '账号已存在',
      })
    }

    const hashedPassword = bcrypt.hashSync(regInfo.password, 10)
    const insertResult = await query('insert into users set ?', {
      account: regInfo.account,
      password: hashedPassword,
      identity: '用户',
      create_time: new Date(),
      status: 0,
    })

    if (insertResult.affectedRows !== 1) {
      return res.send({
        status: 1,
        message: '注册账号失败',
      })
    }

    res.send({
      status: 0,
      message: '注册账号成功',
    })
  } catch (error) {
    res.cc(error)
  }
}

exports.login = async (req, res) => {
  const logInfo = req.body

  try {
    const results = await findUserByAccount(logInfo.account)
    if (results.length !== 1) return res.cc('登录失败')

    const user = results[0]
    const compareResult = bcrypt.compareSync(logInfo.password, user.password)
    if (!compareResult) {
      return res.cc('登录失败')
    }

    if (user.status == 1) {
      return res.cc('账号被冻结')
    }

    // 登录成功后返回 access token，并把 refresh token 写进 Cookie。
    const tokens = await issueTokenPair(user)
    setRefreshTokenCookie(res, tokens.refreshToken)

    res.send({
      results: user,
      status: 0,
      message: '登录成功',
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    res.cc(error)
  }
}

exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

  if (!refreshToken) {
    return res.status(401).send({
      status: 401,
      message: '缺少 RefreshToken',
    })
  }

  let decoded
  try {
    // refresh 接口不需要 access token，它只依赖 Cookie 内的 refresh token。
    decoded = await verifyRefreshToken(refreshToken)
  } catch (error) {
    clearRefreshTokenCookie(res)
    return res.status(401).send({
      status: 401,
      message: error.message,
    })
  }

  try {
    const results = await findUserById(decoded.id)
    if (results.length !== 1) {
      await revokeRefreshToken(refreshToken)
      clearRefreshTokenCookie(res)
      return res.status(401).send({
        status: 401,
        message: '用户不存在，请重新登录',
      })
    }

    const user = results[0]
    if (user.status == 1) {
      await revokeRefreshToken(refreshToken)
      clearRefreshTokenCookie(res)
      return res.status(401).send({
        status: 401,
        message: '账号被冻结，请重新登录',
      })
    }

    // 每次刷新都会旋转 refresh token，旧 token 会在数据库里被撤销。
    const tokens = await rotateRefreshToken(refreshToken, user)
    setRefreshTokenCookie(res, tokens.refreshToken)

    res.send({
      status: 0,
      message: '刷新成功',
      accessToken: tokens.accessToken,
    })
  } catch (error) {
    res.cc(error)
  }
}

exports.logout = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

  try {
    if (refreshToken) {
      await revokeRefreshToken(refreshToken)
    }

    clearRefreshTokenCookie(res)

    res.send({
      status: 0,
      message: '退出登录成功',
    })
  } catch (error) {
    res.cc(error)
  }
}

// 下面这几组菜单数据由后端按用户身份返回，前端再据此动态注册路由。
const superAdminRouter = [
  { name: 'home', path: '/home', meta: { title: '首页' }, component: 'home/index' },
  { name: 'set', path: '/set', meta: { title: '设置' }, component: 'set/index' },
  { name: 'overview', path: '/overview', meta: { title: '系统概览' }, component: 'overview/index' },
  {
    name: 'product_manage',
    path: '/product_manage',
    meta: { title: '产品管理员' },
    component: 'user_manage/product_manage/index',
  },
  {
    name: 'message_manage',
    path: '/message_manage',
    meta: { title: '消息管理员' },
    component: 'user_manage/message_manage/index',
  },
  {
    name: 'user_list',
    path: '/user_list',
    meta: { title: '用户列表' },
    component: 'user_manage/user_list/index',
  },
  {
    name: 'users_manage',
    path: '/users_manage',
    meta: { title: '用户管理' },
    component: 'user_manage/users_manage/index',
  },
  {
    name: 'product_manage_list',
    path: '/product_manage_list',
    meta: { title: '产品管理' },
    component: 'product/product_manage_list/index',
  },
  {
    name: 'out_product_manage_list',
    path: '/out_product_manage_list',
    meta: { title: '出库管理' },
    component: 'product/out_product_manage_list/index',
  },
  {
    name: 'message_list',
    path: '/message_list',
    meta: { title: '消息管理' },
    component: 'message/message_list/index',
  },
  {
    name: 'recycle',
    path: '/recycle',
    meta: { title: '回收站' },
    component: 'message/recycle/index',
  },
  { name: 'file', path: '/file', meta: { title: '文件管理' }, component: 'file/index' },
  {
    name: 'operation_log',
    path: '/operation_log',
    meta: { title: '操作日志' },
    component: 'operation_log/index',
  },
  {
    name: 'login_log',
    path: '/login_log',
    meta: { title: '登录日志' },
    component: 'login_log/index',
  },
]

const userAdminRouter = [
  { name: 'home', path: '/home', meta: { title: '首页' }, component: 'home/index' },
  { name: 'set', path: '/set', meta: { title: '设置' }, component: 'set/index' },
  {
    name: 'user_list',
    path: '/user_list',
    meta: { title: '用户列表' },
    component: 'user_manage/user_list/index',
  },
  {
    name: 'users_manage',
    path: '/users_manage',
    meta: { title: '用户管理' },
    component: 'user_manage/users_manage/index',
  },
  { name: 'file', path: '/file', meta: { title: '文件管理' }, component: 'file/index' },
]

const productAdminRouter = [
  { name: 'home', path: '/home', meta: { title: '首页' }, component: 'home/index' },
  { name: 'set', path: '/set', meta: { title: '设置' }, component: 'set/index' },
  {
    name: 'product_manage_list',
    path: '/product_manage_list',
    meta: { title: '产品管理' },
    component: 'product/product_manage_list/index',
  },
  {
    name: 'out_product_manage_list',
    path: '/out_product_manage_list',
    meta: { title: '出库管理' },
    component: 'product/out_product_manage_list/index',
  },
  { name: 'file', path: '/file', meta: { title: '文件管理' }, component: 'file/index' },
]

const messageAdminRouter = [
  { name: 'home', path: '/home', meta: { title: '首页' }, component: 'home/index' },
  { name: 'set', path: '/set', meta: { title: '设置' }, component: 'set/index' },
  {
    name: 'message_list',
    path: '/message_list',
    meta: { title: '消息管理' },
    component: 'message/message_list/index',
  },
  {
    name: 'recycle',
    path: '/recycle',
    meta: { title: '回收站' },
    component: 'message/recycle/index',
  },
  { name: 'file', path: '/file', meta: { title: '文件管理' }, component: 'file/index' },
]

const userRouter = [
  { name: 'home', path: '/home', meta: { title: '首页' }, component: 'home/index' },
  { name: 'set', path: '/set', meta: { title: '设置' }, component: 'set/index' },
  {
    name: 'product_manage_list',
    path: '/product_manage_list',
    meta: { title: '产品管理' },
    component: 'product/product_manage_list/index',
  },
  {
    name: 'out_product_manage_list',
    path: '/out_product_manage_list',
    meta: { title: '出库管理' },
    component: 'product/out_product_manage_list/index',
  },
  { name: 'file', path: '/file', meta: { title: '文件管理' }, component: 'file/index' },
]

exports.returnMenuList = (req, res) => {
  db.query('select identity from users where id = ?', req.body.id, (err, result) => {
    if (err) return res.cc(err)

    let menu = []
    if (result[0].identity == '超级管理员') {
      menu = superAdminRouter
    }
    if (result[0].identity == '用户管理员') {
      menu = userAdminRouter
    }
    if (result[0].identity == '产品管理员') {
      menu = productAdminRouter
    }
    if (result[0].identity == '消息管理员') {
      menu = messageAdminRouter
    }
    if (result[0].identity == '用户') {
      menu = userRouter
    }

    res.send(menu)
  })
}
