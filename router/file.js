const express = require('express')
const router = express.Router()
const fileHandler = require('../router_handle/file')

// 文件管理路由。
router.post('/uploadFile', fileHandler.uploadFile)
router.post('/bindFileAndUser', fileHandler.bindFileAndUser)
router.post('/updateDownload', fileHandler.updateDownload)
router.post('/downloadFile', fileHandler.downloadFile)
router.post('/fileList', fileHandler.fileList)
router.post('/fileListLength', fileHandler.fileListLength)
router.post('/returnFilesListData', fileHandler.returnFilesListData)
router.post('/searchFile', fileHandler.searchFile)
router.post('/deleteFile', fileHandler.deleteFile)

module.exports = router
