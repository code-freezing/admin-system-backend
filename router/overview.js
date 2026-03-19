const express = require('express')
const router = express.Router()
const overviewHandler = require('../router_handle/overview.js')

// 系统概览统计路由。
router.post('/getCategoryAndNumber', overviewHandler.getCategoryAndNumber)
router.post('/getAdminAndNumber', overviewHandler.getAdminAndNumber)
router.post('/getLevelAndNumber', overviewHandler.getLevelAndNumber)
router.post('/getDayAndNumber', overviewHandler.getDayAndNumber)

module.exports = router
