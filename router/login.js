const express = require('express')
const router = express.Router()
const authHandler = require('../router_handle/login')
const expressJoi = require('@escook/express-joi')
const { login_limit } = require('../limit/login.js')

// 认证模块路由：注册、登录、动态菜单。
router.post('/register', expressJoi(login_limit), authHandler.register)
router.post('/login', expressJoi(login_limit), authHandler.login)
router.post('/returnMenuList', authHandler.returnMenuList)

module.exports = router
