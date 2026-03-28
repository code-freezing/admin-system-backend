/**
 * 模块说明：
 * 1. refresh token 存储服务。
 * 2. 负责把 refresh token 以哈希形式写入数据库，并提供查询、清理和撤销能力。
 * 3. 它保证 refresh token 可以被单独失效，而不必依赖前端主动删除。
 */

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

module.exports = {
  getRefreshToken,
  revokeRefreshToken,
  saveRefreshToken,
}
