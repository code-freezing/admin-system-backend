/**
 * 模块说明：
 * 1. JWT 配置文件。
 * 2. 集中存放 access token 与 refresh token 的密钥和过期时间配置。
 * 3. 认证服务和应用入口都会依赖这里的配置。
 */

module.exports = {
  accessTokenSecretKey: 'codefreezing-access',
  refreshTokenSecretKey: 'codefreezing-refresh',
  accessTokenExpiresIn: '2h',
  refreshTokenExpiresIn: '7d',
}
