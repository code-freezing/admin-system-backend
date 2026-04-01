const db = require('../db/index')
const sendStatus = (res, status, message, extra = {}) => {
  res.send({
    status,
    message,
    ...extra,
  })
}
// 更新部门已读信息列表，保持页面状态和实际数据一致。
const updateDepartmentReadList = (department, transform, onDone) => {
  const sql = 'select read_list,read_status,id from users where department = ?'
  db.query(sql, department, (err, result) => {
    if (err) return onDone(err)

    result.forEach((user) => {
      if (user.read_status != 1) {
        return
      }

      const nextList = JSON.stringify(transform(JSON.parse(user.read_list)))
      const sql1 = 'update users set read_list = ? where id = ?'
      db.query(sql1, [nextList, user.id], () => {})
    })

    onDone()
  })
}

// 初始化用户的部门未读列表。
exports.getDepartmentMsg = (req, res) => {
  const { id, department } = req.body
  // 这个动作通常发生在用户第一次进入部门消息体系时：
  // 先把当前部门下所有可见消息找出来，再整体写入 users.read_list。
  const sql = 'select * from message where message_receipt_object = ? and message_status = 0 '
  db.query(sql, department, (err, results) => {
    if (err) return res.cc(err)
    const msgArr = results.map((item) => item.id)
    const sql1 = 'update users set read_list = ?,read_status = 1 where id = ?'
    db.query(sql1, [JSON.stringify(msgArr), id], (err) => {
      if (err) return res.cc(err)
      sendStatus(res, 0, '', { id, read_list: msgArr })
    })
  })
}

// 获取某个部门可见的消息列表。
exports.getDepartmentMsgList = (req, res) => {
  const { department } = req.body
  // 对应前端顶部消息弹窗里展示的消息列表。
  const sql = 'select * from message where message_receipt_object = ? and message_status = 0 '
  db.query(sql, department, (err, results) => {
    if (err) return res.cc(err)
    res.send(results)
  })
}

// 查询用户当前未读列表和状态。
exports.getReadListAndStatus = (req, res) => {
  // 前端 message store 会先读取这个结果，再决定是否继续拉部门消息列表。
  const sql = 'select read_list,read_status from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 用户读取消息后，从未读列表中移除该消息 ID。
exports.clickDelete = (req, res) => {
  // 这里并不会删除 message 表里的消息本身，
  // 只是把“当前用户未读列表”里对应的消息 id 去掉。
  const sql = 'select read_list from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    const list = JSON.stringify(JSON.parse(result[0].read_list).filter((item) => item != req.body.readId))
    const sql1 = 'update users set read_list = ? where id = ?'
    db.query(sql1, [list, req.body.id], (err) => {
      if (err) return res.cc(err)
      sendStatus(res, 0, '删减成功')
    })
  })
}

// 向部门成员未读列表追加新消息 ID。
exports.changeUserReadList = (req, res) => {
  // 这是 create_edit.vue 发布公司消息后的补充动作。
  // message 表插入新记录后，还需要把这条新消息同步到目标部门成员的 read_list。
  updateDepartmentReadList(req.body.department, (list) => {
    list.push(JSON.parse(req.body.newId))
    return list
  }, (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '更新成功')
  })
}

// 从部门成员未读列表中移除指定消息 ID。
exports.changeUserReadListButDelete = (req, res) => {
  // 当公司消息被删除或接收范围改变时，需要把旧部门成员的未读列表同步清理掉。
  updateDepartmentReadList(
    req.body.department,
    (list) => list.filter((item) => item != req.body.deleteid),
    (err) => {
      if (err) return res.cc(err)
    sendStatus(res, 0, '更新成功')
    }
  )
}
