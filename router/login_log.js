const express = require('express')
const router = express.Router()
const loginLogHandler = require('../router_handle/login_log.js')

// 登录日志路由。
router.post('/loginLog', loginLogHandler.loginLog)
router.post('/loginLogList', loginLogHandler.loginLogList)
router.post('/searchLoginLogList', loginLogHandler.searchLoginLogList)
router.post('/loginLogListLength', loginLogHandler.loginLogListLength)
router.post('/returnLoginListData', loginLogHandler.returnLoginListData)
router.post('/clearLoginLogList', loginLogHandler.clearLoginLogList)

module.exports = router
