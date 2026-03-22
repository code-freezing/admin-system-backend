const express = require('express')
const router = express.Router()
const settingHandler = require('../router_handle/setting')

// 系统设置接口：轮播图、公司信息、部门配置和产品分类。
router.post('/uploadSwiper', settingHandler.uploadSwiper)
router.post('/getAllSwiper', settingHandler.getAllSwiper)
router.post('/getCompanyName', settingHandler.getCompanyName)
router.post('/changeCompanyName', settingHandler.changeCompanyName)
router.post('/changeCompanyIntroduce', settingHandler.changeCompanyIntroduce)
router.post('/getCompanyIntroduce', settingHandler.getCompanyIntroduce)
router.post('/getAllCompanyIntroduce', settingHandler.getAllCompanyIntroduce)
router.post('/setDepartment', settingHandler.setDepartment)
router.post('/getDepartment', settingHandler.getDepartment)
router.post('/setProduct', settingHandler.setProduct)
router.post('/getProduct', settingHandler.getProduct)

module.exports = router
