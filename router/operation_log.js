const express = require('express')
const router = express.Router()
const operationLogHandler = require('../router_handle/operation_log.js')

// 操作日志路由。
router.post('/operationLog', operationLogHandler.operationLog)
router.post('/operationLogList', operationLogHandler.operationLogList)
router.post('/searchOperationLogList', operationLogHandler.searchOperationLogList)
router.post('/operationLogListLength', operationLogHandler.operationLogListLength)
router.post('/returnOperationListData', operationLogHandler.returnOperationListData)
router.post('/clearOperationLogList', operationLogHandler.clearOperationLogList)

module.exports = router
