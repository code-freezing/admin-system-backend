/**
 * 模块说明：
 * 1. 用户与账号安全路由声明。
 * 2. 包含个人资料、头像、找回密码、用户管理和权限管理接口。
 * 3. 这是后端中接口数量最多的业务分组之一。
 */

const express = require('express')
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
router.post('/bindAccount', userHandler.bindAccount)
router.post('/changePassword', expressJoi(password_limit), userHandler.changePassword)
router.post('/getUserInfo', userHandler.getUserInfo)
router.post('/changeName', expressJoi(name_limit), userHandler.changeName)
router.post('/changeSex', userHandler.changeSex)
router.post('/changeEmail', expressJoi(email_limit), userHandler.changeEmail)
router.post('/verifyAccountAndEmail', userHandler.verifyAccountAndEmail)
router.post(
  '/changePasswordInLogin',
  expressJoi(forgetPassword_limit),
  userHandler.changePasswordInLogin
)

// 后台用户管理接口。
router.post('/createAdmin', requirePermission('api.user.admin.create'), userHandler.createAdmin)
router.post('/getAdminList', requirePermission('api.user.admin.read'), userHandler.getAdminList)
router.post(
  '/editAdmin',
  requireAnyPermission(['api.user.admin.edit', 'api.user.user.edit']),
  userHandler.editAdmin
)
router.post('/changeIdentityToUser', requirePermission('api.user.admin.demote'), userHandler.changeIdentityToUser)
router.post('/changeIdentityToAdmin', requirePermission('api.user.user.promote'), userHandler.changeIdentityToAdmin)
router.post('/searchUser', requireAnyPermission(['api.user.admin.read', 'api.user.user.read']), userHandler.searchUser)
router.post('/searchUserByDepartment', requirePermission('api.user.user.read'), userHandler.searchUserByDepartment)
router.post('/banUser', requirePermission('api.user.user.ban'), userHandler.banUser)
router.post('/hotUser', requirePermission('api.user.user.unban'), userHandler.hotUser)
router.post('/getBanList', requirePermission('api.user.user.read'), userHandler.getBanList)
router.post('/deleteUser', requirePermission('api.user.user.delete'), userHandler.deleteUser)
router.post('/getAdminListLength', requireAnyPermission(['api.user.admin.read', 'api.user.user.read']), userHandler.getAdminListLength)
router.post('/returnListData', requireAnyPermission(['api.user.admin.read', 'api.user.user.read']), userHandler.returnListData)

module.exports = router
