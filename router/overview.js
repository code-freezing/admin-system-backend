/**
 * 模块说明：
 * 1. 系统概览路由声明。
 * 2. 挂载概览页所需的统计查询接口。
 * 3. 前端图表和统计卡片通过这些接口取数。
 */

const express = require('express')
const router = express.Router()
const overviewHandler = require('../router_handle/overview.js')
const { requirePermission } = require('../middleware/access')

// 概览页统计接口，直接服务首页图表。
router.post('/getCategoryAndNumber', requirePermission('api.overview.read'), overviewHandler.getCategoryAndNumber)
router.post('/getAdminAndNumber', requirePermission('api.overview.read'), overviewHandler.getAdminAndNumber)
router.post('/getLevelAndNumber', requirePermission('api.overview.read'), overviewHandler.getLevelAndNumber)
router.post('/getDayAndNumber', requirePermission('api.overview.read'), overviewHandler.getDayAndNumber)

module.exports = router
