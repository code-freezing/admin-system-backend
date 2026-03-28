/**
 * 模块说明：
 * 1. 登录日志业务处理层。
 * 2. 负责写入和查询登录日志，支持分页和条件搜索。
 * 3. 管理员通过它回溯账号登录历史。
 */

const db = require('../db/index')

// 写入一条登录日志。
exports.loginLog = (req, res) => {
  const { account, name, email } = req.body
  const loginTime = new Date()
  const sql = 'insert into login_log set ?'
  db.query(sql, { account, name, email, login_time: loginTime }, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
    })
  })
}

// 获取登录日志列表。
exports.loginLogList = (req, res) => {
  const sql = 'select * from login_log'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 根据账号搜索最近 10 条登录记录。
exports.searchLoginLogList = (req, res) => {
  const sql = 'select * from login_log where account = ? ORDER BY login_time desc limit 10'
  db.query(sql, req.body.account, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 获取登录日志总数。
exports.loginLogListLength = (req, res) => {
  const sql = 'select count(*) as total from login_log'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

// 分页获取登录日志，每页 10 条。
exports.returnLoginListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from login_log ORDER BY login_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 清空登录日志表。
exports.clearLoginLogList = (req, res) => {
  const sql = 'truncate table login_log'
  db.query(sql, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '数据表清空成功',
    })
  })
}
