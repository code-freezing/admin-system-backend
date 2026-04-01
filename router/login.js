const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const authHandler = require('../router_handle/login')
const expressJoi = require('@escook/express-joi')
const { login_limit } = require('../limit/login.js')

// 认证模块路由：注册、登录、刷新 token、退出登录和登录后菜单加载。
router.post('/register', expressJoi(login_limit), authHandler.register)
// 处理登录接口，请求进入后会继续交给业务处理层。
router.post('/login', expressJoi(login_limit), authHandler.login)
// 处理刷新流程接口，请求进入后会继续交给业务处理层。
router.post('/refresh', authHandler.refreshToken)
// 处理退出登录接口，请求进入后会继续交给业务处理层。
router.post('/logout', authHandler.logout)
// 处理鉴权资料接口，请求进入后会继续交给业务处理层。
router.post('/authProfile', authHandler.authProfile)
// 处理菜单列表接口，请求进入后会继续交给业务处理层。
router.post('/returnMenuList', authHandler.returnMenuList)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
