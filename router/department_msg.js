const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const departmentMessageHandler = require('../router_handle/department_msg.js')
const { requirePermission } = require('../middleware/access')

// 部门消息与未读列表接口。
// 这些接口虽然不在消息列表页路由下，但它们是消息模块“未读提醒”能力的一部分。
// 前端主要由顶部 department_message 弹窗和 create_edit 发布成功后的补充调用触发。
router.post('/getDepartmentMsg', departmentMessageHandler.getDepartmentMsg)
// 处理部门消息列表接口，请求进入后会继续交给业务处理层。
router.post('/getDepartmentMsgList', departmentMessageHandler.getDepartmentMsgList)
// 处理已读信息列表状态接口，请求进入后会继续交给业务处理层。
router.post('/getReadListAndStatus', departmentMessageHandler.getReadListAndStatus)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
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

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
