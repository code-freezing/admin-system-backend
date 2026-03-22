const db = require('../db/index.js')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const fs = require('fs')

// 用户信息模块同时承载个人资料、找回密码和后台用户管理等能力。
// 这里的大多数接口直接操作 users 表，少量会联动 image 表中的头像记录。

// 上传头像后先写入 image 表，并生成 onlyId 作为后续绑定账号的临时标识。
exports.uploadAvatar = (req, res) => {
  const onlyId = crypto.randomUUID()
  let oldName = req.files[0].filename
  let newName = Buffer.from(req.files[0].originalname, 'latin1').toString('utf8')
  fs.renameSync('./public/upload/' + oldName, './public/upload/' + newName)
  const sql = 'insert into image set ?'
  db.query(
    sql,
    {
      image_url: `http://127.0.0.1:3007/upload/${newName}`,
      onlyId,
    },
    (err) => {
      if (err) return res.cc(err)
      res.send({
        onlyId,
        status: 0,
        url: 'http://127.0.0.1:3007/upload/' + newName,
      })
    }
  )
}

// 头像上传和账号绑定拆成两步，避免用户在未完成表单前就直接覆盖正式头像。
exports.bindAccount = (req, res) => {
  const { account, onlyId, url } = req.body
  const sql = 'update image set account = ? where onlyId = ?'
  db.query(sql, [account, onlyId], (err, result) => {
    if (err) return res.cc(err)
    if (result.affectedRows == 1) {
      const sql1 = 'update users set image_url = ? where account = ?'
      db.query(sql1, [url, account], (error) => {
        if (error) return res.cc(error)
        res.send({
          status: 0,
          message: '修改成功',
        })
      })
    }
  })
}

// 已登录用户修改密码时，需要先校验旧密码，再写入新的哈希值。
exports.changePassword = (req, res) => {
  const sql = 'select password from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    const compareResult = bcrypt.compareSync(req.body.oldPassword, result[0].password)
    if (!compareResult) {
      return res.send({
        status: 1,
        message: '原密码错误',
      })
    }
    req.body.newPassword = bcrypt.hashSync(req.body.newPassword, 10)
    const sql1 = 'update users set password = ? where id = ?'
    db.query(sql1, [req.body.newPassword, req.body.id], (error) => {
      if (error) return res.cc(error)
      res.send({
        status: 0,
        message: '修改成功',
      })
    })
  })
}

// 获取当前用户资料时会把 password 清空，避免前端拿到哈希值。
exports.getUserInfo = (req, res) => {
  const sql = 'select * from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    result[0].password = ''
    res.send(result[0])
  })
}

// 以下三个接口分别修改昵称、性别和邮箱，保持页面保存粒度简单明确。
exports.changeName = (req, res) => {
  const { id, name } = req.body
  const sql = 'update users set name = ? where id = ?'
  db.query(sql, [name, id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改成功',
    })
  })
}

exports.changeSex = (req, res) => {
  const { id, sex } = req.body
  const sql = 'update users set sex = ? where id = ?'
  db.query(sql, [sex, id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改成功',
    })
  })
}

exports.changeEmail = (req, res) => {
  const { id, email } = req.body
  const sql = 'update users set email = ? where id = ?'
  db.query(sql, [email, id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改成功',
    })
  })
}

// 登录页找回密码前，先校验账号和邮箱是否匹配。
exports.verifyAccountAndEmail = (req, res) => {
  const { account, email } = req.body
  const sql = 'select * from users where account = ?'
  db.query(sql, account, (err, result) => {
    if (err) return res.cc(err)
    if (email == result[0].email) {
      res.send({
        status: 0,
        message: '查询成功',
        id: result[0].id,
      })
    } else {
      res.send({
        status: 1,
        message: '查询失败',
      })
    }
  })
}

// 找回密码成功后直接重置密码，不再要求旧密码。
exports.changePasswordInLogin = (req, res) => {
  const user = req.body
  user.newPassword = bcrypt.hashSync(user.newPassword, 10)
  const sql = 'update users set password = ? where id = ?'
  db.query(sql, [user.newPassword, user.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '更新成功',
    })
  })
}

// 后台用户管理从这里开始，支持创建管理员和后续权限调整。
exports.createAdmin = (req, res) => {
  const { account, password, name, sex, department, email, identity } = req.body
  const sql = 'select * from users where account = ?'
  db.query(sql, account, (err, results) => {
    if (err) return res.cc(err)
    if (results.length > 0) {
      return res.send({
        status: 1,
        message: '账号已存在',
      })
    }
    const hashpassword = bcrypt.hashSync(password, 10)
    const sql1 = 'insert into users set ?'
    const create_time = new Date()
    db.query(
      sql1,
      {
        account,
        password: hashpassword,
        name,
        sex,
        department,
        email,
        identity,
        create_time,
        status: 0,
      },
      (error, insertResult) => {
        if (error) return res.cc(error)
        if (insertResult.affectedRows !== 1) {
          return res.send({
            status: 1,
            message: '添加管理员失败',
          })
        }
        res.send({
          status: 0,
          message: '添加管理员成功',
        })
      }
    )
  })
}

// 列表返回前会抹掉不需要给表格展示的敏感字段。
exports.getAdminList = (req, res) => {
  const sql = 'select * from users where identity = ?'
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    result.forEach((e) => {
      e.password = ''
      e.create_time = ''
      e.image_url = ''
      e.status = ''
    })
    res.send(result)
  })
}

// 如果编辑时变更了部门，需要清空未读消息状态，避免旧部门消息继续挂在账号上。
exports.editAdmin = (req, res) => {
  const { id, name, sex, email, department } = req.body
  const date = new Date()
  const sql0 = 'select department from users where id = ?'
  db.query(sql0, id, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].department == department) {
      const updateContent = {
        id,
        name,
        sex,
        email,
        department,
        update_time: date,
      }
      const sql = 'update users set ? where id = ?'
      db.query(sql, [updateContent, updateContent.id], (error) => {
        if (error) return res.cc(error)
        res.send({
          status: 0,
          message: '修改管理员信息成功',
        })
      })
    } else {
      const updateContent = {
        id,
        name,
        sex,
        email,
        department,
        update_time: date,
        read_list: null,
        read_status: 0,
      }
      const sql = 'update users set ? where id = ?'
      db.query(sql, [updateContent, updateContent.id], (error) => {
        if (error) return res.cc(error)
        res.send({
          status: 0,
          message: '修改管理员信息成功',
        })
      })
    }
  })
}

// 管理员降级为普通用户后，只更新身份，不保留管理角色。
exports.changeIdentityToUser = (req, res) => {
  const identity = '用户'
  const sql = 'update users set identity = ? where id = ?'
  db.query(sql, [identity, req.body.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '降级成功',
    })
  })
}

// 普通用户升级为管理员时顺带刷新更新时间，方便后续审计。
exports.changeIdentityToAdmin = (req, res) => {
  const date = new Date()
  const sql = 'update users set identity = ?,update_time = ? where id = ?'
  db.query(sql, [req.body.identity, date, req.body.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '赋权成功',
    })
  })
}

// 查询接口按账号、身份和部门拆开，页面可以按不同筛选条件单独调用。
exports.searchUser = (req, res) => {
  const { account, identity } = req.body
  const sql = 'select * from users where account = ? and identity = ?'
  db.query(sql, [account, identity], (err, result) => {
    if (err) return res.cc(err)
    result.forEach((e) => {
      e.password = ''
      e.create_time = ''
      e.image_url = ''
      e.status = ''
    })
    res.send(result)
  })
}

exports.searchUserByDepartment = (req, res) => {
  const sql = 'select * from users where department = ? and identity = "用户"'
  db.query(sql, req.body.department, (err, result) => {
    if (err) return res.cc(err)
    result.forEach((e) => {
      e.password = ''
      e.image_url = ''
    })
    res.send(result)
  })
}

// 冻结和解冻通过 status 字段控制，不直接删除账号数据。
exports.banUser = (req, res) => {
  const status = 1
  const sql = 'update users set status = ? where id = ?'
  db.query(sql, [status, req.body.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '冻结成功',
    })
  })
}

exports.hotUser = (req, res) => {
  const status = 0
  const sql = 'update users set status = ? where id = ?'
  db.query(sql, [status, req.body.id], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '解冻成功',
    })
  })
}

exports.getBanList = (req, res) => {
  const sql = 'select * from users where status = "1" '
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 删除用户时顺带清理头像绑定记录，避免 image 表残留脏数据。
exports.deleteUser = (req, res) => {
  const sql = 'delete from users where id = ?'
  db.query(sql, req.body.id, (err) => {
    if (err) return res.cc(err)
    const sql1 = 'delete from image where account = ?'
    db.query(sql1, req.body.account, (error) => {
      if (error) return res.cc(error)
      res.send({
        status: 0,
        message: '删除用户成功',
      })
    })
  })
}

// 列表总数和分页数据分开返回，方便前端分页组件复用。
exports.getAdminListLength = (req, res) => {
  const sql = 'select * from users where identity = ? '
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.returnListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from users where identity = ? ORDER BY create_time limit 10 offset ${number} `
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
