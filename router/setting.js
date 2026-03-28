/**
 * 模块说明：
 * 1. 系统设置路由声明。
 * 2. 挂载公司信息、轮播图和首页展示内容维护接口。
 * 3. 它服务于设置页，也间接影响首页展示。
 */

const express = require('express')
const router = express.Router()
const settingHandler = require('../router_handle/setting')
const { requirePermission } = require('../middleware/access')

// 系统设置接口：轮播图、公司信息、部门配置和产品分类。
// 和前端设置页标签大致对应：
// 1. 账号设置：不在这里，走 userinfo 路由
// 2. 公司设置：首页文案相关接口
// 3. 首页管理：uploadSwiper/getAllSwiper
// 4. 字典维护：setDepartment/getDepartment/setProduct/getProduct
router.post(
  '/uploadSwiper',
  requirePermission('api.setting.write.swiper'),
  settingHandler.uploadSwiper
)
router.post('/getAllSwiper', settingHandler.getAllSwiper)
router.post('/getCompanyName', settingHandler.getCompanyName)
router.post(
  '/changeCompanyName',
  requirePermission('api.setting.write.company'),
  settingHandler.changeCompanyName
)
router.post(
  '/changeCompanyIntroduce',
  requirePermission('api.setting.write.company'),
  settingHandler.changeCompanyIntroduce
)
router.post('/getCompanyIntroduce', settingHandler.getCompanyIntroduce)
router.post('/getAllCompanyIntroduce', settingHandler.getAllCompanyIntroduce)
router.post(
  '/setDepartment',
  requirePermission('api.setting.write.dictionary'),
  settingHandler.setDepartment
)
router.post('/getDepartment', settingHandler.getDepartment)
router.post(
  '/setProduct',
  requirePermission('api.setting.write.dictionary'),
  settingHandler.setProduct
)
router.post('/getProduct', settingHandler.getProduct)

module.exports = router
