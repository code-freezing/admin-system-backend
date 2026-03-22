const db = require('../db/index')

// 消息模块负责公告发布、筛选、详情、回收站和分页统计。
// message_status 为 0 表示正常消息，为 1 表示已进入回收站。

exports.publishMessage = (req, res) => {
  const {
    message_title,
    message_category,
    message_publish_department,
    message_publish_name,
    message_receipt_object,
    message_content,
    message_level,
  } = req.body
  const message_publish_time = new Date()
  const sql = 'insert into message set ? '
  db.query(
    sql,
    {
      message_title,
      message_category,
      message_publish_department,
      message_publish_name,
      message_publish_time,
      message_click_number: 0,
      message_status: 0,
      message_receipt_object,
      message_content,
      message_level,
    },
    (err, result) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '发布消息成功',
        department: message_receipt_object,
        id: result.insertId,
      })
    }
  )
}

// 首页公告面板只取最新 5 条，避免一次加载过多历史数据。
exports.companyMessageList = (req, res) => {
  const sql =
    'select * from message where message_category = "公司公告" and message_status = "0" order by message_publish_time DESC limit 5'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.systemMessageList = (req, res) => {
  const sql =
    'select * from message where message_category = "系统消息" and message_status = "0"  order by message_publish_time DESC limit 5'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 编辑消息时要同步 users.read_list，避免部门变更后未读消息状态错乱。
exports.editMessage = (req, res) => {
  const {
    message_title,
    message_publish_name,
    message_content,
    message_receipt_object,
    message_level,
    id,
  } = req.body
  const returnOldDepartment = (messageId) => {
    return new Promise((resolve) => {
      const sql = 'select message_receipt_object from message where id = ?'
      db.query(sql, messageId, (err, result) => {
        if (err) return resolve(null)
        resolve(result[0].message_receipt_object)
      })
    })
  }

  const pushIdInReadList = (newDepartment, newId) => {
    const sql = 'select read_list,read_status,id from users where department = ?'
    db.query(sql, newDepartment, (err, result) => {
      if (err) return res.cc(err)
      result.forEach((e) => {
        if (e.read_status == 1) {
          let arr = JSON.parse(e.read_list)
          arr.push(JSON.parse(newId))
          arr = JSON.stringify(arr)
          const sql1 = 'update users set read_list = ? where id = ?'
          db.query(sql1, [arr, e.id], () => {})
        }
      })
    })
  }

  const deleteIdInReadList = (oldDepartment, deleteId) => {
    const sql = 'select read_list,read_status,id from users where department = ?'
    db.query(sql, oldDepartment, (err, result) => {
      if (err) return res.cc(err)
      result.forEach((e) => {
        if (e.read_status == 1) {
          let arr = JSON.parse(e.read_list)
          arr = arr.filter((item) => {
            return item != deleteId
          })
          arr = JSON.stringify(arr)
          const sql1 = 'update users set read_list = ? where id = ?'
          db.query(sql1, [arr, e.id], () => {})
        }
      })
    })
  }

  async function change() {
    const receiptObj = await returnOldDepartment(id)
    if (receiptObj !== '全体成员' && receiptObj !== message_receipt_object) {
      pushIdInReadList(message_receipt_object, id)
      deleteIdInReadList(receiptObj, id)
    }
    if (message_receipt_object == '全体成员' && receiptObj !== message_receipt_object) {
      deleteIdInReadList(receiptObj, id)
    }
    if (receiptObj == '全体成员' && receiptObj !== message_receipt_object) {
      pushIdInReadList(message_receipt_object, id)
    }
    const message_update_time = new Date()
    const sql =
      'update message set message_title = ?,message_publish_name= ?,message_content = ? ,message_receipt_object = ?,message_level= ?,message_update_time= ? where id = ?'
    db.query(
      sql,
      [
        message_title,
        message_publish_name,
        message_content,
        message_receipt_object,
        message_level,
        message_update_time,
        id,
      ],
      (err) => {
        if (err) return res.cc(err)
        res.send({
          status: 0,
          message: '编辑消息成功',
        })
      }
    )
  }
  change()
}

exports.searchMessageBydepartment = (req, res) => {
  const sql = 'select * from message where message_publish_department = ? and message_status = "0"'
  db.query(sql, req.body.message_publish_department, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.searchMessageByLevel = (req, res) => {
  const sql = 'select * from message where message_level = ? and message_status = "0"'
  db.query(sql, req.body.message_level, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.getMessage = (req, res) => {
  const sql = 'select * from message where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 点击量在后端累加，避免前端直接提交新值造成并发覆盖。
exports.updateClick = (req, res) => {
  const { message_click_number, id } = req.body
  const number = message_click_number * 1 + 1
  const sql = 'update message set message_click_number = ? where id = ?'
  db.query(sql, [number, id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '点击率增加',
    })
  })
}

// 删除流程分成软删除、恢复和永久删除，便于后台做回收站管理。
exports.firstDelete = (req, res) => {
  const message_status = 1
  const message_delete_time = new Date()
  const sql = 'update message set message_status = ? ,message_delete_time = ? where id = ?'
  db.query(sql, [message_status, message_delete_time, req.body.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '删除成功',
    })
  })
}

exports.recycleList = (req, res) => {
  const sql = 'select * from message where message_status = 1'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.getRecycleMessageLength = (req, res) => {
  const sql = 'select * from message where message_status = 1'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.returnRecycleListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from message where message_status = 1 ORDER BY message_delete_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.recover = (req, res) => {
  const message_status = 0
  const message_update_time = new Date()
  const sql = 'update message set message_status = ? ,message_update_time = ? where id = ?'
  db.query(sql, [message_status, message_update_time, req.body.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '还原成功',
    })
  })
}

exports.deleteMessage = (req, res) => {
  const sql = 'delete from message where id = ?'
  db.query(sql, req.body.id, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '删除消息成功',
    })
  })
}

// 公司公告和系统消息共用同一张表，只靠 message_category 区分。
exports.getCompanyMessageLength = (req, res) => {
  const sql = 'select * from message where message_category ="公司公告"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.getSystemMessageLength = (req, res) => {
  const sql = 'select * from message where message_category ="系统消息"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.returnCompanyListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from message where message_category ="公司公告" and message_status = 0 ORDER BY message_publish_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.returnSystemListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from message where message_category ="系统消息"  and message_status = 0  ORDER BY message_publish_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
