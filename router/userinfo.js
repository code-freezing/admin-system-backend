const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const expressJoi = require('@escook/express-joi')
const userHandler = require('../router_handle/userinfo')
const { requireAnyPermission, requirePermission } = require('../middleware/access')
const {
  password_limit,
  name_limit,
  email_limit,
  forgetPassword_limit,
} = require('../limit/user.js')

// 用户资料与账号安全接口。
router.post('/uploadAvatar', userHandler.uploadAvatar)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/bindAccount', userHandler.bindAccount)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/changePassword', expressJoi(password_limit), userHandler.changePassword)
// 处理用户信息接口，请求进入后会继续交给业务处理层。
router.post('/getUserInfo', userHandler.getUserInfo)
// 处理名称接口，请求进入后会继续交给业务处理层。
router.post('/changeName', expressJoi(name_limit), userHandler.changeName)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/changeSex', userHandler.changeSex)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/changeEmail', expressJoi(email_limit), userHandler.changeEmail)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/verifyAccountAndEmail', userHandler.verifyAccountAndEmail)
router.post(
  '/changePasswordInLogin',
  expressJoi(forgetPassword_limit),
  userHandler.changePasswordInLogin
)

// 后台用户管理接口。
router.post('/createAdmin', requirePermission('api.user.admin.create'), userHandler.createAdmin)
// 处理列表接口，请求进入后会继续交给业务处理层。
router.post('/getAdminList', requirePermission('api.user.admin.read'), userHandler.getAdminList)
router.post(
  '/editAdmin',
  requireAnyPermission(['api.user.admin.edit', 'api.user.user.edit']),
  userHandler.editAdmin
)
router.post(
  '/changeIdentityToUser',
  requirePermission('api.user.admin.demote'),
  userHandler.changeIdentityToUser
)
router.post(
  '/changeIdentityToAdmin',
  requirePermission('api.user.user.promote'),
  userHandler.changeIdentityToAdmin
)
router.post(
  '/searchUser',
  requireAnyPermission(['api.user.admin.read', 'api.user.user.read']),
  userHandler.searchUser
)
router.post(
  '/searchUserByDepartment',
  requirePermission('api.user.user.read'),
  userHandler.searchUserByDepartment
)
// 处理用户接口，请求进入后会继续交给业务处理层。
router.post('/banUser', requirePermission('api.user.user.ban'), userHandler.banUser)
// 处理用户接口，请求进入后会继续交给业务处理层。
router.post('/hotUser', requirePermission('api.user.user.unban'), userHandler.hotUser)
// 处理列表接口，请求进入后会继续交给业务处理层。
router.post('/getBanList', requirePermission('api.user.user.read'), userHandler.getBanList)
// 处理用户接口，请求进入后会继续交给业务处理层。
router.post('/deleteUser', requirePermission('api.user.user.delete'), userHandler.deleteUser)
router.post(
  '/getAdminListLength',
  requireAnyPermission(['api.user.admin.read', 'api.user.user.read']),
  userHandler.getAdminListLength
)
router.post(
  '/returnListData',
  requireAnyPermission(['api.user.admin.read', 'api.user.user.read']),
  userHandler.returnListData
)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
