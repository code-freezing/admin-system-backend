const express = require('express')
const router = express.Router()
const expressJoi = require('@escook/express-joi')
const userHandler = require('../router_handle/userinfo')
const {
  password_limit,
  name_limit,
  email_limit,
  forgetPassword_limit,
} = require('../limit/user.js')

// 用户资料与账号安全路由。
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

// 用户管理路由。
router.post('/createAdmin', userHandler.createAdmin)
router.post('/getAdminList', userHandler.getAdminList)
router.post('/editAdmin', userHandler.editAdmin)
router.post('/changeIdentityToUser', userHandler.changeIdentityToUser)
router.post('/changeIdentityToAdmin', userHandler.changeIdentityToAdmin)
router.post('/searchUser', userHandler.searchUser)
router.post('/searchUserByDepartment', userHandler.searchUserByDepartment)
router.post('/banUser', userHandler.banUser)
router.post('/hotUser', userHandler.hotUser)
router.post('/getBanList', userHandler.getBanList)
router.post('/deleteUser', userHandler.deleteUser)
router.post('/getAdminListLength', userHandler.getAdminListLength)
router.post('/returnListData', userHandler.returnListData)

module.exports = router
