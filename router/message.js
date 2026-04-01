const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const messageHandler = require('../router_handle/message')
const { requirePermission } = require('../middleware/access')

// 公告消息接口，涵盖发布、筛选、回收站和分页查询。
// 可以按前端页面这样理解：
// 1. message_list 页面：publish/edit/search/get*Length/return*ListData
// 2. recycle 页面：firstDelete/recycleList/recover/deleteMessage
// 3. 首页面板：companyMessageList/systemMessageList/updateClick/getMessage
router.post(
  '/publishMessage',
  requirePermission('api.message.publish'),
  messageHandler.publishMessage
)
// 处理消息列表接口，请求进入后会继续交给业务处理层。
router.post('/companyMessageList', messageHandler.companyMessageList)
// 处理消息列表接口，请求进入后会继续交给业务处理层。
router.post('/systemMessageList', messageHandler.systemMessageList)
// 处理消息接口，请求进入后会继续交给业务处理层。
router.post('/editMessage', requirePermission('api.message.edit'), messageHandler.editMessage)
router.post(
  '/searchMessageBydepartment',
  requirePermission('api.message.list.read'),
  messageHandler.searchMessageBydepartment
)
router.post(
  '/searchMessageByLevel',
  requirePermission('api.message.list.read'),
  messageHandler.searchMessageByLevel
)
// 处理消息接口，请求进入后会继续交给业务处理层。
router.post('/getMessage', messageHandler.getMessage)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/updateClick', messageHandler.updateClick)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/firstDelete', requirePermission('api.message.delete'), messageHandler.firstDelete)
router.post(
  '/recycleList',
  requirePermission('api.message.recycle.read'),
  messageHandler.recycleList
)
router.post(
  '/getRecycleMessageLength',
  requirePermission('api.message.recycle.read'),
  messageHandler.getRecycleMessageLength
)
router.post(
  '/returnRecycleListData',
  requirePermission('api.message.recycle.read'),
  messageHandler.returnRecycleListData
)
// 处理当前接口请求，权限校验通过后继续交给业务处理层。
router.post('/recover', requirePermission('api.message.recover'), messageHandler.recover)
router.post(
  '/deleteMessage',
  requirePermission('api.message.permanent_delete'),
  messageHandler.deleteMessage
)
router.post(
  '/getCompanyMessageLength',
  requirePermission('api.message.list.read'),
  messageHandler.getCompanyMessageLength
)
router.post(
  '/getSystemMessageLength',
  requirePermission('api.message.list.read'),
  messageHandler.getSystemMessageLength
)
router.post(
  '/returnCompanyListData',
  requirePermission('api.message.list.read'),
  messageHandler.returnCompanyListData
)
router.post(
  '/returnSystemListData',
  requirePermission('api.message.list.read'),
  messageHandler.returnSystemListData
)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
