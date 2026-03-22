const jwt = require('jsonwebtoken')
const jwtconfig = require('../jwt_config')
const { getRefreshToken, revokeRefreshToken, saveRefreshToken } = require('./refresh_token_store')

// 项目里的过期时间配置是 "2h"、"7d" 这种形式，这里转成毫秒方便写数据库和 Cookie。
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

// access token 里不需要放密码和时间戳这些无意义字段，先做一次净化。
const sanitizeUser = (user) => ({
  ...user,
  password: '',
  imageUrl: '',
  create_time: '',
  update_time: '',
})

const issueTokenPair = async (user) => {
  const tokenUser = sanitizeUser(user)

  // access token 给业务接口鉴权，refresh token 只用于换新。
  const accessToken = jwt.sign(tokenUser, jwtconfig.accessTokenSecretKey, {
    expiresIn: jwtconfig.accessTokenExpiresIn,
  })
  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: 'refresh',
    },
    jwtconfig.refreshTokenSecretKey,
    {
      expiresIn: jwtconfig.refreshTokenExpiresIn,
    }
  )

  await saveRefreshToken(
    refreshToken,
    {
      id: user.id,
    },
    new Date(Date.now() + parseExpiresInToMs(jwtconfig.refreshTokenExpiresIn))
  )

  return {
    accessToken: `Bearer ${accessToken}`,
    refreshToken,
  }
}

const verifyRefreshToken = async (refreshToken) => {
  // 先查数据库，再验签；两边都通过才说明 refresh token 仍然可用。
  const storedToken = await getRefreshToken(refreshToken)
  if (!storedToken) {
    throw new Error('RefreshToken 已失效，请重新登录')
  }

  const decoded = jwt.verify(refreshToken, jwtconfig.refreshTokenSecretKey)
  if (decoded.type !== 'refresh') {
    throw new Error('RefreshToken 类型无效')
  }

  return decoded
}

const rotateRefreshToken = async (refreshToken, user) => {
  // 刷新成功后立刻废弃旧 refresh token，并生成一对新的 token。
  await revokeRefreshToken(refreshToken)
  return issueTokenPair(user)
}

module.exports = {
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyRefreshToken,
}
