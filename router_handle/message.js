const db = require('../db/index')

// 发布消息。
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

// 获取公司公告列表。
exports.companyMessageList = (req, res) => {
  const sql =
    'select * from message where message_category = "公司公告" and message_status = "0" order by message_publish_time DESC limit 5'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 获取系统消息列表。
exports.systemMessageList = (req, res) => {
  const sql =
    'select * from message where message_category = "系统消息" and message_status = "0"  order by message_publish_time DESC limit 5'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 编辑消息并同步部门未读列表。
exports.editMessage = (req, res) => {
  const {
    message_title,
    message_publish_name,
    message_content,
    message_receipt_object,
    message_level,
    id,
  } = req.body
  const returnOldDepartment = (id) => {
    return new Promise((resolve) => {
      const sql = 'select message_receipt_object from message where id = ?'
      db.query(sql, id, (err, result) => {
        resolve(result[0].message_receipt_object)
      })
    })
  }
  const pushIdInReadList = (newDepartment, newid) => {
    const sql = 'select read_list,read_status,id from users where department = ?'
    db.query(sql, newDepartment, (err, result) => {
      if (err) return res.cc(err)
      result.forEach((e) => {
        if (e.read_status == 1) {
          let arr = JSON.parse(e.read_list)
          arr.push(JSON.parse(newid))
          arr = JSON.stringify(arr)
          const sql1 = 'update users set read_list = ? where id = ?'
          db.query(sql1, [arr, e.id], (err, result) => {})
        }
      })
    })
  }

  const deleteIdInReadList = (oldDepartment, deleteid) => {
    const sql = 'select read_list,read_status,id from users where department = ?'
    db.query(sql, oldDepartment, (err, result) => {
      if (err) return res.cc(err)
      result.forEach((e) => {
        if (e.read_status == 1) {
          let arr = JSON.parse(e.read_list)
          arr = arr.filter((item) => {
            return item != deleteid
          })
          arr = JSON.stringify(arr)
          const sql1 = 'update users set read_list = ? where id = ?'
          db.query(sql1, [arr, e.id], (err, result) => {})
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
      (err, result) => {
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

// 按发布部门筛选消息。
exports.searchMessageBydepartment = (req, res) => {
  const sql = 'select * from message where message_publish_department = ? and message_status = "0"'
  db.query(sql, req.body.message_publish_department, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 按消息等级筛选消息。
exports.searchMessageByLevel = (req, res) => {
  const sql = 'select * from message where message_level = ? and message_status = "0"'
  db.query(sql, req.body.message_level, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 获取消息详情。
exports.getMessage = (req, res) => {
  const sql = 'select * from message where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 增加点击次数。
exports.updateClick = (req, res) => {
  const { message_click_number, id } = req.body
  const number = message_click_number * 1 + 1
  const sql = 'update message set message_click_number = ? where id = ?'
  db.query(sql, [number, id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '点击率增加',
    })
  })
}

// 软删除消息到回收站。
exports.firstDelete = (req, res) => {
  const message_status = 1
  const message_delete_time = new Date()
  const sql = 'update message set message_status = ? ,message_delete_time = ? where id = ?'
  db.query(sql, [message_status, message_delete_time, req.body.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '删除成功',
    })
  })
}

// 获取回收站列表。
exports.recycleList = (req, res) => {
  const sql = 'select * from message where message_status = 1'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 获取回收站总数。
exports.getRecycleMessageLength = (req, res) => {
  const sql = 'select * from message where message_status = 1'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

// 分页获取回收站数据。
exports.returnRecycleListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from message where message_status = 1 ORDER BY message_delete_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 从回收站还原消息。
exports.recover = (req, res) => {
  const message_status = 0
  const message_update_time = new Date()
  const sql = 'update message set message_status = ? ,message_update_time = ? where id = ?'
  db.query(sql, [message_status, message_update_time, req.body.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '还原成功',
    })
  })
}

// 永久删除消息。
exports.deleteMessage = (req, res) => {
  const sql = 'delete from message where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '删除消息成功',
    })
  })
}

// 获取公司公告总数。
exports.getCompanyMessageLength = (req, res) => {
  const sql = 'select * from message where message_category ="公司公告"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

// 获取系统消息总数。
exports.getSystemMessageLength = (req, res) => {
  const sql = 'select * from message where message_category ="系统消息"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

// 分页获取公司公告列表。
exports.returnCompanyListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from message where message_category ="公司公告" and message_status = 0 ORDER BY message_publish_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 分页获取系统消息列表。
exports.returnSystemListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from message where message_category ="系统消息"  and message_status = 0  ORDER BY message_publish_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
