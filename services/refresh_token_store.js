const crypto = require('crypto')
const db = require('../db')

// 这里把 callback 风格的 db.query 包装成 Promise，方便在认证链路里用 async/await。
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

// 数据库只保存 refresh token 的哈希值，避免明文 token 泄露后可直接复用。
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

// 每次读写前顺手清理无效记录，保持这张表不会无限增长。
const cleanupExpiredTokens = async () => {
  await query(
    `
      delete from user_refresh_tokens
      where revoked_at is not null
         or expires_at <= now()
    `
  )
}

// 保存刷新流程Token，确保当前改动能在后续流程里被读取到。
const saveRefreshToken = async (token, payload, expiresAt) => {
  await cleanupExpiredTokens()
  await query('insert into user_refresh_tokens set ?', {
    user_id: payload.id,
    token_hash: hashToken(token),
    expires_at: expiresAt,
    created_at: new Date(),
    updated_at: new Date(),
  })
}

// 这里只返回仍然有效的 refresh token 记录，已撤销或已过期的 token 会直接查不到。
const getRefreshToken = async (token) => {
  await cleanupExpiredTokens()
  const results = await query(
    `
      select id, user_id, token_hash, expires_at, revoked_at
      from user_refresh_tokens
      where token_hash = ?
        and revoked_at is null
        and expires_at > now()
      limit 1
    `,
    [hashToken(token)]
  )

  return results[0] || null
}

// 登出或刷新时会撤销旧 refresh token，防止旧 token 被继续使用。
const revokeRefreshToken = async (token) => {
  await query(
    `
      update user_refresh_tokens
      set revoked_at = now(), updated_at = now()
      where token_hash = ?
        and revoked_at is null
    `,
    [hashToken(token)]
  )
}

// 导出当前模块的公共能力，方便其他业务文件按需复用。
module.exports = {
  getRefreshToken,
  revokeRefreshToken,
  saveRefreshToken,
}
