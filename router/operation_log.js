const express = require('express')
const router = express.Router()
const operationLogHandler = require('../router_handle/operation_log.js')

// 操作日志接口：写入日志、分页查询、筛选和清空。
router.post('/operationLog', operationLogHandler.operationLog)
router.post('/operationLogList', operationLogHandler.operationLogList)
router.post('/searchOperationLogList', operationLogHandler.searchOperationLogList)
router.post('/operationLogListLength', operationLogHandler.operationLogListLength)
router.post('/returnOperationListData', operationLogHandler.returnOperationListData)
router.post('/clearOperationLogList', operationLogHandler.clearOperationLogList)

module.exports = router
