/**
 * 模块说明：
 * 1. 文件管理业务处理层。
 * 2. 处理文件上传、删除、查询和列表返回等合同管理能力。
 * 3. 同时负责与 public/upload 目录中的真实文件对应起来。
 */

const db = require('../db/index')
const fs = require('fs')

// 上传文件并写入文件元数据。
exports.uploadFile = (req, res) => {
  let oldName = req.files[0].filename
  let newName = Buffer.from(req.files[0].originalname, 'latin1').toString('utf8')
  let uploadTime = new Date()
  const sql1 = 'select * from files where file_name = ?'
  db.query(sql1, newName, (err, results) => {
    if (err) return res.cc(err)
    if (results.length > 1) {
      return res.send({
        status: 1,
        message: '文件名已存在',
      })
    }

    fs.renameSync('./public/upload/' + oldName, './public/upload/' + newName)
    const sql = 'insert into files set ?'
    db.query(
      sql,
      {
        file_url: `http://127.0.0.1:3007/upload/${newName}`,
        file_name: newName,
        file_size: (req.files[0].size * 1) / 1024,
        upload_time: uploadTime,
        download_number: 0,
      },
      (err) => {
        if (err) return res.cc(err)
        res.send({
          status: 0,
          url: 'http://127.0.0.1:3007/upload/' + newName,
        })
      }
    )
  })
}

// 绑定文件上传者。
exports.bindFileAndUser = (req, res) => {
  const { name, url } = req.body
  const sql = 'update files set upload_person = ? where file_url = ?'
  db.query(sql, [name, url], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '绑定成功',
    })
  })
}

// 更新文件下载次数。
exports.updateDownload = (req, res) => {
  const { download_number, id } = req.body
  const number = download_number * 1 + 1
  const sql = 'update files set download_number = ? where id = ?'
  db.query(sql, [number, id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '下载量增加',
    })
  })
}

// 返回文件下载地址。
exports.downloadFile = (req, res) => {
  const sql = 'select * from files where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result[0].file_url)
  })
}

// 获取全部文件列表。
exports.fileList = (req, res) => {
  const sql = 'select * from files '
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 获取文件总数。
exports.fileListLength = (req, res) => {
  const sql = 'select count(*) as total from files'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

// 分页获取文件列表，每页 10 条。
exports.returnFilesListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from files  ORDER BY upload_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 按文件名模糊搜索。
exports.searchFile = (req, res) => {
  const fileName = req.body.file_name
  const sql = `select * from files where file_name like '%${fileName}%' `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 删除文件记录并删除磁盘文件。
exports.deleteFile = (req, res) => {
  const sql = `delete from files where id = ? `
  db.query(sql, req.body.id, (err) => {
    fs.unlink(`./public/upload/${req.body.file_name}`, (err) => {
      if (err) return res.cc(err)
    })
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '删除成功',
    })
  })
}
