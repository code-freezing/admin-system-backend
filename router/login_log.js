/**
 * 模块说明：
 * 1. 登录日志路由声明。
 * 2. 负责挂载登录日志查询、分页和搜索类接口。
 * 3. 与操作日志、消息等模块保持同样的拆分结构。
 */

const express = require('express')
const router = express.Router()
const loginLogHandler = require('../router_handle/login_log.js')
const { requirePermission } = require('../middleware/access')

// 登录日志接口：写日志、分页查询、筛选和清空。
router.post('/loginLog', loginLogHandler.loginLog)
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

module.exports = router
