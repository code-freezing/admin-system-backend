/**
 * 模块说明：
 * 1. 消息模块路由声明。
 * 2. 负责挂载消息公告的发布、编辑、回收站和列表查询接口。
 * 3. 消息相关的业务细节全部下沉到 handler 文件。
 */

const express = require('express')
const router = express.Router()
const messageHandler = require('../router_handle/message')
const { requirePermission } = require('../middleware/access')

// 公告消息接口，涵盖发布、筛选、回收站和分页查询。
// 可以按前端页面这样理解：
// 1. message_list 页面：publish/edit/search/get*Length/return*ListData
// 2. recycle 页面：firstDelete/recycleList/recover/deleteMessage
// 3. 首页面板：companyMessageList/systemMessageList/updateClick/getMessage
router.post('/publishMessage', requirePermission('api.message.publish'), messageHandler.publishMessage)
router.post('/companyMessageList', messageHandler.companyMessageList)
router.post('/systemMessageList', messageHandler.systemMessageList)
router.post('/editMessage', requirePermission('api.message.edit'), messageHandler.editMessage)
router.post('/searchMessageBydepartment', requirePermission('api.message.list.read'), messageHandler.searchMessageBydepartment)
router.post('/searchMessageByLevel', requirePermission('api.message.list.read'), messageHandler.searchMessageByLevel)
router.post('/getMessage', messageHandler.getMessage)
router.post('/updateClick', messageHandler.updateClick)
router.post('/firstDelete', requirePermission('api.message.delete'), messageHandler.firstDelete)
router.post('/recycleList', requirePermission('api.message.recycle.read'), messageHandler.recycleList)
router.post('/getRecycleMessageLength', requirePermission('api.message.recycle.read'), messageHandler.getRecycleMessageLength)
router.post('/returnRecycleListData', requirePermission('api.message.recycle.read'), messageHandler.returnRecycleListData)
router.post('/recover', requirePermission('api.message.recover'), messageHandler.recover)
router.post('/deleteMessage', requirePermission('api.message.permanent_delete'), messageHandler.deleteMessage)
router.post('/getCompanyMessageLength', requirePermission('api.message.list.read'), messageHandler.getCompanyMessageLength)
router.post('/getSystemMessageLength', requirePermission('api.message.list.read'), messageHandler.getSystemMessageLength)
router.post('/returnCompanyListData', requirePermission('api.message.list.read'), messageHandler.returnCompanyListData)
router.post('/returnSystemListData', requirePermission('api.message.list.read'), messageHandler.returnSystemListData)

module.exports = router
