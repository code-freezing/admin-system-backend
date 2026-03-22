const crypto = require('crypto')
const db = require('../db')

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

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

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
