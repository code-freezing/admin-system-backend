const db = require('../db/index')
const sendStatus = (res, status, message, extra = {}) => {
  res.send({
    status,
    message,
    ...extra,
  })
}
// 统一发送错误结果，避免不同分支各自拼接响应结构。
const sendRows = (res, rows) => res.send(rows)

// 写入一条登录日志。
exports.loginLog = (req, res) => {
  const { account, name, email } = req.body
  const loginTime = new Date()
  const sql = 'insert into login_log set ?'
  db.query(sql, { account, name, email, login_time: loginTime }, (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '')
  })
}

// 获取登录日志列表。
exports.loginLogList = (req, res) => {
  const sql = 'select * from login_log'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    sendRows(res, result)
  })
}

// 根据账号搜索最近 10 条登录记录。
exports.searchLoginLogList = (req, res) => {
  const sql = 'select * from login_log where account = ? ORDER BY login_time desc limit 10'
  db.query(sql, req.body.account, (err, result) => {
    if (err) return res.cc(err)
    sendRows(res, result)
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
  const sql = 'select * from login_log order by login_time desc limit 10 offset ?'
  db.query(sql, [number], (err, result) => {
    if (err) return res.cc(err)
    sendRows(res, result)
  })
}

// 清空登录日志表。
exports.clearLoginLogList = (req, res) => {
  const sql = 'truncate table login_log'
  db.query(sql, (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '数据表清空成功')
  })
}
