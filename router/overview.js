const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const overviewHandler = require('../router_handle/overview.js')
const { requirePermission } = require('../middleware/access')

// 概览页统计接口，直接服务首页图表。
router.post(
  '/getCategoryAndNumber',
  requirePermission('api.overview.read'),
  overviewHandler.getCategoryAndNumber
)
router.post(
  '/getAdminAndNumber',
  requirePermission('api.overview.read'),
  overviewHandler.getAdminAndNumber
)
router.post(
  '/getLevelAndNumber',
  requirePermission('api.overview.read'),
  overviewHandler.getLevelAndNumber
)
router.post(
  '/getDayAndNumber',
  requirePermission('api.overview.read'),
  overviewHandler.getDayAndNumber
)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
