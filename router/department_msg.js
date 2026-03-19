const express = require('express')
const router = express.Router()
const departmentMessageHandler = require('../router_handle/department_msg.js')

// 部门消息与未读列表路由。
router.post('/getDepartmentMsg', departmentMessageHandler.getDepartmentMsg)
router.post('/getDepartmentMsgList', departmentMessageHandler.getDepartmentMsgList)
router.post('/getReadListAndStatus', departmentMessageHandler.getReadListAndStatus)
router.post('/clickDelete', departmentMessageHandler.clickDelete)
router.post('/changeUserReadList', departmentMessageHandler.changeUserReadList)
router.post('/changeUserReadListButDelete', departmentMessageHandler.changeUserReadListButDelete)

module.exports = router
