const db = require('../db/index')

// 初始化用户的部门未读列表。
exports.getDepartmentMsg = (req, res) => {
  const { id, department } = req.body
  const sql = 'select * from message where message_receipt_object = ? and message_status = 0 '
  db.query(sql, department, (err, results) => {
    if (err) return res.cc(err)
    const msgArr = []
    results.forEach((e) => {
      msgArr.push(e.id)
    })
    const sql1 = 'update users set read_list = ?,read_status = 1 where id = ?'
    db.query(sql1, [JSON.stringify(msgArr), id], (err) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        id,
        read_list: msgArr,
      })
    })
  })
}

// 获取某个部门可见的消息列表。
exports.getDepartmentMsgList = (req, res) => {
  const { department } = req.body
  const sql = 'select * from message where message_receipt_object = ? and message_status = 0 '
  db.query(sql, department, (err, results) => {
    if (err) return res.cc(err)
    res.send(results)
  })
}

// 查询用户当前未读列表和状态。
exports.getReadListAndStatus = (req, res) => {
  const sql = 'select read_list,read_status from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 用户读取消息后，从未读列表中移除该消息 ID。
exports.clickDelete = (req, res) => {
  const sql = 'select read_list from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    const list = JSON.stringify(
      JSON.parse(result[0].read_list).filter((item) => item != req.body.readId)
    )
    const sql1 = 'update users set read_list = ? where id = ?'
    db.query(sql1, [list, req.body.id], (err) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '删减成功',
      })
    })
  })
}

// 向部门成员未读列表追加新消息 ID。
exports.changeUserReadList = (req, res) => {
  const sql = 'select read_list,read_status,id from users where department = ?'
  db.query(sql, req.body.department, (err, result) => {
    if (err) return res.cc(err)
    result.forEach((e) => {
      if (e.read_status == 1) {
        let arr = JSON.parse(e.read_list)
        arr.push(JSON.parse(req.body.newId))
        arr = JSON.stringify(arr)
        const sql1 = 'update users set read_list = ? where id = ?'
        db.query(sql1, [arr, e.id], () => {})
      }
    })
    res.send({
      status: 0,
      message: '更新成功',
    })
  })
}

// 从部门成员未读列表中移除指定消息 ID。
exports.changeUserReadListButDelete = (req, res) => {
  const sql = 'select read_list,read_status,id from users where department = ?'
  db.query(sql, req.body.department, (err, result) => {
    if (err) return res.cc(err)
    result.forEach((e) => {
      if (e.read_status == 1) {
        let arr = JSON.parse(e.read_list)
        arr = arr.filter((item) => {
          return item != req.body.deleteid
        })
        arr = JSON.stringify(arr)
        const sql1 = 'update users set read_list = ? where id = ?'
        db.query(sql1, [arr, e.id], () => {})
      }
    })
    res.send({
      status: 0,
      message: '更新成功',
    })
  })
}
