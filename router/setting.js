const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
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
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/getAllSwiper', settingHandler.getAllSwiper)
// 处理名称接口，请求进入后会继续交给业务处理层。
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
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/getCompanyIntroduce', settingHandler.getCompanyIntroduce)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/getAllCompanyIntroduce', settingHandler.getAllCompanyIntroduce)
router.post(
  '/setDepartment',
  requirePermission('api.setting.write.dictionary'),
  settingHandler.setDepartment
)
// 处理部门接口，请求进入后会继续交给业务处理层。
router.post('/getDepartment', settingHandler.getDepartment)
router.post(
  '/setProduct',
  requirePermission('api.setting.write.dictionary'),
  settingHandler.setProduct
)
// 处理产品接口，请求进入后会继续交给业务处理层。
router.post('/getProduct', settingHandler.getProduct)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
