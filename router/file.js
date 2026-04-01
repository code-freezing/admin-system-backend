const express = require('express')
// 创建当前模块的路由实例，后续接口都会挂在这里。
const router = express.Router()
const fileHandler = require('../router_handle/file')
const { requirePermission } = require('../middleware/access')

// 文件管理接口：上传、下载、列表、搜索和删除。
router.post(
  '/initMultipartUpload',
  requirePermission('api.file.upload'),
  fileHandler.initMultipartUpload
)
// 处理上传接口，请求进入后会继续交给业务处理层。
router.post('/uploadChunk', requirePermission('api.file.upload'), fileHandler.uploadChunk)
router.post(
  '/completeMultipartUpload',
  requirePermission('api.file.upload'),
  fileHandler.completeMultipartUpload
)
router.post(
  '/abortMultipartUpload',
  requirePermission('api.file.upload'),
  fileHandler.abortMultipartUpload
)
// 处理上传文件接口，请求进入后会继续交给业务处理层。
router.post('/uploadFile', requirePermission('api.file.upload'), fileHandler.uploadFile)
// 处理文件用户接口，请求进入后会继续交给业务处理层。
router.post('/bindFileAndUser', requirePermission('api.file.upload'), fileHandler.bindFileAndUser)
// 处理下载接口，请求进入后会继续交给业务处理层。
router.post('/updateDownload', requirePermission('api.file.read'), fileHandler.updateDownload)
// 处理下载文件接口，请求进入后会继续交给业务处理层。
router.post('/downloadFile', requirePermission('api.file.read'), fileHandler.downloadFile)
// 处理文件列表接口，请求进入后会继续交给业务处理层。
router.post('/fileList', requirePermission('api.file.read'), fileHandler.fileList)
// 处理文件列表接口，请求进入后会继续交给业务处理层。
router.post('/fileListLength', requirePermission('api.file.read'), fileHandler.fileListLength)
router.post(
  '/returnFilesListData',
  requirePermission('api.file.read'),
  fileHandler.returnFilesListData
)
// 处理查询条件文件接口，请求进入后会继续交给业务处理层。
router.post('/searchFile', requirePermission('api.file.read'), fileHandler.searchFile)
// 处理文件接口，请求进入后会继续交给业务处理层。
router.post('/deleteFile', requirePermission('api.file.delete'), fileHandler.deleteFile)

// 导出当前模块的路由实例，供应用入口统一挂载。
module.exports = router
