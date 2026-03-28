/**
 * 模块说明：
 * 1. 文件模块路由声明。
 * 2. 统一挂载合同/文件管理相关接口。
 * 3. 接口定义层保持轻量，便于快速查看路由分组。
 */

const express = require('express')
const router = express.Router()
const fileHandler = require('../router_handle/file')
const { requirePermission } = require('../middleware/access')

// 文件管理接口：上传、下载、列表、搜索和删除。
router.post('/initMultipartUpload', requirePermission('api.file.upload'), fileHandler.initMultipartUpload)
router.post('/uploadChunk', requirePermission('api.file.upload'), fileHandler.uploadChunk)
router.post('/completeMultipartUpload', requirePermission('api.file.upload'), fileHandler.completeMultipartUpload)
router.post('/abortMultipartUpload', requirePermission('api.file.upload'), fileHandler.abortMultipartUpload)
router.post('/uploadFile', requirePermission('api.file.upload'), fileHandler.uploadFile)
router.post('/bindFileAndUser', requirePermission('api.file.upload'), fileHandler.bindFileAndUser)
router.post('/updateDownload', requirePermission('api.file.read'), fileHandler.updateDownload)
router.post('/downloadFile', requirePermission('api.file.read'), fileHandler.downloadFile)
router.post('/fileList', requirePermission('api.file.read'), fileHandler.fileList)
router.post('/fileListLength', requirePermission('api.file.read'), fileHandler.fileListLength)
router.post('/returnFilesListData', requirePermission('api.file.read'), fileHandler.returnFilesListData)
router.post('/searchFile', requirePermission('api.file.read'), fileHandler.searchFile)
router.post('/deleteFile', requirePermission('api.file.delete'), fileHandler.deleteFile)

module.exports = router
