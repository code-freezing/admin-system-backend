const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const loginLogHandler = require('../router_handle/login_log.js')
const { requirePermission } = require('../middleware/access')

// 登录日志接口：写日志、分页查询、筛选和清空。
router.post('/loginLog', loginLogHandler.loginLog)
// 处理登录日志列表接口，请求进入后会继续交给业务处理层。
router.post('/loginLogList', requirePermission('api.log.login.read'), loginLogHandler.loginLogList)
router.post(
  '/searchLoginLogList',
  requirePermission('api.log.login.read'),
  loginLogHandler.searchLoginLogList
)
router.post(
  '/loginLogListLength',
  requirePermission('api.log.login.read'),
  loginLogHandler.loginLogListLength
)
router.post(
  '/returnLoginListData',
  requirePermission('api.log.login.read'),
  loginLogHandler.returnLoginListData
)
router.post(
  '/clearLoginLogList',
  requirePermission('api.log.login.clear'),
  loginLogHandler.clearLoginLogList
)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
