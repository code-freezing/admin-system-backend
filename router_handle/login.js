const db = require('../db/index.js')
const bcrypt = require('bcrypt')
const jwtconfig = require('../jwt_config')
const {
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
} = require('../services/token')
const { getRoleCodeByIdentity, replaceUserRoles } = require('../services/access_control')

const REFRESH_COOKIE_NAME = 'refreshToken'
const AUTH_USER_COLUMNS = `
  id,
  account,
  password,
  name,
  sex,
  department,
  email,
  identity,
  image_url,
  create_time,
  update_time,
  status,
  read_status,
  read_list
`

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

const sendStatus = (res, status, message, extra = {}) => {
  res.send({
    status,
    message,
    ...extra,
  })
}

// 统一发送错误结果，避免不同分支各自拼接响应结构。
const sendUnauthorized = (res, message) => {
  res.status(401).send({
    status: 401,
    message,
  })
}

// 解析当前输入，把原始内容转成后续可直接使用的结构。
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

// 更新刷新流程TokenCookie，避免状态分散在多个位置维护。
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions())
}

// 清理刷新流程TokenCookie，防止旧状态残留到下一次流程。
const clearRefreshTokenCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  })
}

// 这两个查询函数单独抽出，是为了让登录、刷新 token 等流程复用同一套取数方式。
const findUserByAccount = (account) =>
  query(`select ${AUTH_USER_COLUMNS} from users where account = ? limit 1`, [account])

// 处理用户，把当前模块的关键逻辑集中在这里。
const findUserById = (id) =>
  query(`select ${AUTH_USER_COLUMNS} from users where id = ? limit 1`, [id])

// 处理当前注册流程，把账号信息正式写入系统。
exports.register = async (req, res) => {
  const regInfo = req.body

  if (!regInfo.account || !regInfo.password) {
    return sendStatus(res, 1, '账号或密码不能为空')
  }

  try {
    const results = await query('select id from users where account = ? limit 1', [regInfo.account])

    if (results.length > 0) {
      return sendStatus(res, 1, '账号已存在')
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
      return sendStatus(res, 1, '注册账号失败')
    }

    await replaceUserRoles(insertResult.insertId, [getRoleCodeByIdentity('用户')])

    sendStatus(res, 0, '注册账号成功')
  } catch (error) {
    res.cc(error)
  }
}

// 处理当前登录流程，在认证通过后建立当前会话。
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

// 刷新Token，避免旧凭证过期后直接中断当前会话。
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

  if (!refreshToken) {
    return sendUnauthorized(res, '缺少 RefreshToken')
  }

  let decoded
  try {
    // refresh 接口不需要 access token，它只依赖 Cookie 内的 refresh token。
    decoded = await verifyRefreshToken(refreshToken)
  } catch (error) {
    clearRefreshTokenCookie(res)
    return sendUnauthorized(res, error.message)
  }

  try {
    const results = await findUserById(decoded.id)
    if (results.length !== 1) {
      // token 虽然合法，但用户可能已经被删除，此时也必须把旧会话清掉。
      await revokeRefreshToken(refreshToken)
      clearRefreshTokenCookie(res)
      return sendUnauthorized(res, '用户不存在，请重新登录')
    }

    const user = results[0]
    if (user.status == 1) {
      // 账号被冻结后，不允许继续通过 refresh token 延长会话。
      await revokeRefreshToken(refreshToken)
      clearRefreshTokenCookie(res)
      return sendUnauthorized(res, '账号被冻结，请重新登录')
    }

    // 每次刷新都会旋转 refresh token，旧 token 会在数据库里被撤销。
    const tokens = await rotateRefreshToken(refreshToken, user)
    setRefreshTokenCookie(res, tokens.refreshToken)

    sendStatus(res, 0, '刷新成功', { accessToken: tokens.accessToken })
  } catch (error) {
    res.cc(error)
  }
}

// 处理当前退出流程，把会话和相关凭证一起清掉。
exports.logout = async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

  try {
    if (refreshToken) {
      await revokeRefreshToken(refreshToken)
    }

    clearRefreshTokenCookie(res)

    sendStatus(res, 0, '退出登录成功')
  } catch (error) {
    res.cc(error)
  }
}

// 处理鉴权资料，把当前模块的关键逻辑集中在这里。
exports.authProfile = async (req, res) => {
  if (!req.accessContext) {
    return sendUnauthorized(res, '无效的 Token')
  }

  sendStatus(res, 0, '获取权限上下文成功', {
    user: req.accessContext.user,
    roles: req.accessContext.roles,
    permissionCodes: req.accessContext.permissionCodes,
    menus: req.accessContext.menuTree,
  })
}

// 返回菜单列表，让上层直接消费最终结果。
exports.returnMenuList = (req, res) => {
  if (!req.accessContext) {
    return sendUnauthorized(res, '无效的 Token')
  }

  res.send(req.accessContext.menuTree)
}
