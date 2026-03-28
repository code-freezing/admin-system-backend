/**
 * 模块说明：
 * 1. 部门消息路由声明。
 * 2. 只负责把部门消息相关 URL 映射到对应 handler。
 * 3. 真正的数据库读写逻辑都放在 router_handle 中。
 */

const express = require('express')
const router = express.Router()
const departmentMessageHandler = require('../router_handle/department_msg.js')
const { requirePermission } = require('../middleware/access')

// 部门消息与未读列表接口。
// 这些接口虽然不在消息列表页路由下，但它们是消息模块“未读提醒”能力的一部分。
// 前端主要由顶部 department_message 弹窗和 create_edit 发布成功后的补充调用触发。
router.post('/getDepartmentMsg', departmentMessageHandler.getDepartmentMsg)
router.post('/getDepartmentMsgList', departmentMessageHandler.getDepartmentMsgList)
router.post('/getReadListAndStatus', departmentMessageHandler.getReadListAndStatus)
router.post('/clickDelete', departmentMessageHandler.clickDelete)
router.post(
  '/changeUserReadList',
  requirePermission('api.message.publish'),
  departmentMessageHandler.changeUserReadList
)
router.post(
  '/changeUserReadListButDelete',
  requirePermission('api.message.edit'),
  departmentMessageHandler.changeUserReadListButDelete
)

module.exports = router
