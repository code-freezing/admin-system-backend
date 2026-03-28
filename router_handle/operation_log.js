/**
 * 模块说明：
 * 1. 操作日志业务处理层。
 * 2. 负责保存前端操作埋点并提供后台查询接口。
 * 3. 它是系统审计能力的重要组成部分。
 */

const db = require('../db/index')

// 写入一条操作日志。
exports.operationLog = (req, res) => {
  const { operation_person, operation_content, operation_level } = req.body
  const operationTime = new Date()
  const sql = 'insert into operation_log set ?'
  db.query(
    sql,
    { operation_person, operation_content, operation_level, operation_time: operationTime },
    (err) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '操作记录成功',
      })
    }
  )
}

// 获取操作日志列表。
exports.operationLogList = (req, res) => {
  const sql = 'select * from operation_log'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 根据操作者搜索最近 10 条记录。
exports.searchOperationLogList = (req, res) => {
  const sql =
    'select * from operation_log where operation_person = ? ORDER BY operation_time desc limit 10'
  db.query(sql, req.body.operation_person, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 获取操作日志总数。
exports.operationLogListLength = (req, res) => {
  const sql = 'select count(*) as total from operation_log'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

// 分页获取操作日志，每页 10 条。
exports.returnOperationListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from operation_log ORDER BY operation_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 清空操作日志表。
exports.clearOperationLogList = (req, res) => {
  const sql = 'truncate table operation_log'
  db.query(sql, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '数据表清空成功',
    })
  })
}
