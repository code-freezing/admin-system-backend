/**
 * 模块说明：
 * 1. 认证模块路由声明。
 * 2. 定义注册、登录、刷新 token、退出登录和菜单加载接口。
 * 3. 请求进来后会先经过参数校验，再进入登录 handler。
 */

const express = require('express')
const router = express.Router()
const authHandler = require('../router_handle/login')
const expressJoi = require('@escook/express-joi')
const { login_limit } = require('../limit/login.js')

// 认证模块路由：注册、登录、刷新 token、退出登录和登录后菜单加载。
router.post('/register', expressJoi(login_limit), authHandler.register)
router.post('/login', expressJoi(login_limit), authHandler.login)
router.post('/refresh', authHandler.refreshToken)
router.post('/logout', authHandler.logout)
router.post('/authProfile', authHandler.authProfile)
router.post('/returnMenuList', authHandler.returnMenuList)

module.exports = router
