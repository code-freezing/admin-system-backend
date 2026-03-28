/**
 * 模块说明：
 * 1. 操作日志路由声明。
 * 2. 挂载操作日志列表、搜索和分页接口。
 * 3. 日志本身的写入与查询细节在对应 handler 中处理。
 */

const express = require('express')
const router = express.Router()
const operationLogHandler = require('../router_handle/operation_log.js')
const { requirePermission } = require('../middleware/access')

// 操作日志接口：写入日志、分页查询、筛选和清空。
router.post('/operationLog', operationLogHandler.operationLog)
router.post('/operationLogList', requirePermission('api.log.operation.read'), operationLogHandler.operationLogList)
router.post('/searchOperationLogList', requirePermission('api.log.operation.read'), operationLogHandler.searchOperationLogList)
router.post('/operationLogListLength', requirePermission('api.log.operation.read'), operationLogHandler.operationLogListLength)
router.post('/returnOperationListData', requirePermission('api.log.operation.read'), operationLogHandler.returnOperationListData)
router.post('/clearOperationLogList', requirePermission('api.log.operation.clear'), operationLogHandler.clearOperationLogList)

module.exports = router
