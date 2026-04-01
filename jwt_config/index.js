// 导出当前模块的公共能力，方便其他业务文件按需复用。
module.exports = {
  accessTokenSecretKey: 'codefreezing-access',
  refreshTokenSecretKey: 'codefreezing-refresh',
  accessTokenExpiresIn: '2h',
  refreshTokenExpiresIn: '7d',
}
