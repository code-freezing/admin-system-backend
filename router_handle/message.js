/**
 * 模块说明：
 * 1. 消息公告业务处理层。
 * 2. 负责消息发布、编辑、列表、回收站和已读状态联动等复杂逻辑。
 * 3. 它需要同时维护 message 表和 users.read_list 的一致性。
 */

const db = require('../db/index')

// 消息模块负责公告发布、筛选、详情、回收站和分页统计。
// message_status 为 0 表示正常消息，为 1 表示已进入回收站。
// 前端主要对应：
// 1. views/message/message_list/index.vue
// 2. views/message/components/create_edit.vue
// 3. views/message/recycle/index.vue

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
      // 这里把 insertId 返回给前端，是为了让前端继续调用 department_msg 模块，
      // 把新消息 ID 追加到对应部门成员的 read_list 中。
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
  // 这是首页“公司公告”区域使用的接口，不是后台消息列表页的分页接口。
  const sql =
    'select * from message where message_category = "公司公告" and message_status = "0" order by message_publish_time DESC limit 5'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.systemMessageList = (req, res) => {
  // 这是首页“系统消息”区域使用的接口。
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
      // 编辑时要先知道旧接收对象，才能决定未读列表该迁移还是删除。
      const sql = 'select message_receipt_object from message where id = ?'
      db.query(sql, messageId, (err, result) => {
        if (err) return resolve(null)
        resolve(result[0].message_receipt_object)
      })
    })
  }

  const pushIdInReadList = (newDepartment, newId) => {
    // 某些用户已经初始化了 read_list，需要把这条消息 id 补进去，
    // 否则部门变更后他们会直接把新消息视为“已读”。
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
    // 消息不再面向旧部门时，要把旧部门成员 read_list 里的这条消息移除，
    // 避免之后仍在部门消息中显示一条已经不属于他们的公告。
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
    // 下面三段判断是在处理“消息接收范围发生变化”时的已读状态迁移：
    // 1. 旧部门 -> 新部门：旧部门删掉，新部门补上；
    // 2. 旧部门 -> 全体成员：旧部门删掉，由全体成员统一可见；
    // 3. 全体成员 -> 新部门：把新部门成员的已读列表补齐。
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
  // 对应前端公司消息列表里的“按发布部门筛选”。
  const sql = 'select * from message where message_publish_department = ? and message_status = "0"'
  db.query(sql, req.body.message_publish_department, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.searchMessageByLevel = (req, res) => {
  // 对应前端公司消息列表里的“按级别筛选”。
  const sql = 'select * from message where message_level = ? and message_status = "0"'
  db.query(sql, req.body.message_level, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.getMessage = (req, res) => {
  // 查看详情时按主键取一条完整消息，包含富文本正文。
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
  // 软删除只改 message_status，不直接删数据库记录，
  // 因为前端 recycle 页面还需要显示这条消息并支持恢复。
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
  // 对应消息回收站页的数据来源。
  const sql = 'select * from message where message_status = 1'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.getRecycleMessageLength = (req, res) => {
  const sql = 'select count(*) as total from message where message_status = 1'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
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
  // 恢复时重新回到正常消息列表，因此把状态改回 0 并顺手更新更新时间。
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
  // 永久删除是回收站里的最终动作，会真正删除 message 表记录。
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
  // 对应后台“公司消息”标签页分页器总数。
  const sql = 'select count(*) as total from message where message_category ="公司公告" and message_status = 0'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

exports.getSystemMessageLength = (req, res) => {
  // 对应后台“系统消息”标签页分页器总数。
  const sql = 'select count(*) as total from message where message_category ="系统消息" and message_status = 0'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

exports.returnCompanyListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  // 后台列表页显示的公司消息，会过滤掉已进入回收站的记录。
  const sql = `select * from message where message_category ="公司公告" and message_status = 0 ORDER BY message_publish_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.returnSystemListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  // 系统消息标签页同样只展示正常状态的数据。
  const sql = `select * from message where message_category ="系统消息"  and message_status = 0  ORDER BY message_publish_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
