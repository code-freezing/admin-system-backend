const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const operationLogHandler = require('../router_handle/operation_log.js')
const { requirePermission } = require('../middleware/access')

// 操作日志接口：写入日志、分页查询、筛选和清空。
router.post('/operationLog', operationLogHandler.operationLog)
router.post(
  '/operationLogList',
  requirePermission('api.log.operation.read'),
  operationLogHandler.operationLogList
)
router.post(
  '/searchOperationLogList',
  requirePermission('api.log.operation.read'),
  operationLogHandler.searchOperationLogList
)
router.post(
  '/operationLogListLength',
  requirePermission('api.log.operation.read'),
  operationLogHandler.operationLogListLength
)
router.post(
  '/returnOperationListData',
  requirePermission('api.log.operation.read'),
  operationLogHandler.returnOperationListData
)
router.post(
  '/clearOperationLogList',
  requirePermission('api.log.operation.clear'),
  operationLogHandler.clearOperationLogList
)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
