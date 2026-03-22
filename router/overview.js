const express = require('express')
const router = express.Router()
const overviewHandler = require('../router_handle/overview.js')

// 概览页统计接口，直接服务首页图表。
router.post('/getCategoryAndNumber', overviewHandler.getCategoryAndNumber)
router.post('/getAdminAndNumber', overviewHandler.getAdminAndNumber)
router.post('/getLevelAndNumber', overviewHandler.getLevelAndNumber)
router.post('/getDayAndNumber', overviewHandler.getDayAndNumber)

module.exports = router
