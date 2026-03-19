const db = require('../db/index.js')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const fs = require('fs')

// 上传头像并生成临时绑定标识。
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
    (err, result) => {
      if (err) return res.cc(err)
      res.send({
        onlyId,
        status: 0,
        url: 'http://127.0.0.1:3007/upload/' + newName,
      })
    }
  )
}

// 将头像记录与账号绑定。
exports.bindAccount = (req, res) => {
  const { account, onlyId, url } = req.body
  const sql = 'update image set account = ? where onlyId = ?'
  db.query(sql, [account, onlyId], (err, result) => {
    if (err) return res.cc(err)
    if (result.affectedRows == 1) {
      const sql1 = 'update users set image_url = ? where account = ?'
      db.query(sql1, [url, account], (err, result) => {
        if (err) return res.cc(err)
        res.send({
          status: 0,
          message: '修改成功',
        })
      })
    }
  })
}

// 用户登录后修改密码。
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
    db.query(sql1, [req.body.newPassword, req.body.id], (err, result) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '修改成功',
      })
    })
  })
}

// 获取用户信息。
exports.getUserInfo = (req, res) => {
  const sql = 'select * from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    result[0].password = ''
    res.send(result[0])
  })
}

// 修改用户名。
exports.changeName = (req, res) => {
  const { id, name } = req.body
  const sql = 'update users set name = ? where id = ?'
  db.query(sql, [name, id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改成功',
    })
  })
}

// 修改性别。
exports.changeSex = (req, res) => {
  const { id, sex } = req.body
  const sql = 'update users set sex = ? where id = ?'
  db.query(sql, [sex, id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改成功',
    })
  })
}

// 修改邮箱。
exports.changeEmail = (req, res) => {
  const { id, email } = req.body
  const sql = 'update users set email = ? where id = ?'
  db.query(sql, [email, id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改成功',
    })
  })
}

// 校验账号与邮箱是否匹配。
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

// 登录页重置密码。
exports.changePasswordInLogin = (req, res) => {
  const user = req.body
  user.newPassword = bcrypt.hashSync(user.newPassword, 10)
  const sql = 'update users set password = ? where id = ?'
  db.query(sql, [user.newPassword, user.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '更新成功',
    })
  })
}

// 用户管理：创建管理员账号。
exports.createAdmin = (req, res) => {
  const { account, password, name, sex, department, email, identity } = req.body
  const sql = 'select * from users where account = ?'
  db.query(sql, account, (err, results) => {
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
      (err, results) => {
        if (results.affectedRows !== 1) {
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

// 按身份获取管理员列表。
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

// 编辑管理员信息。
exports.editAdmin = (req, res) => {
  const { id, name, sex, email, department } = req.body
  const date = new Date()
  const sql0 = 'select department from users where id = ?'
  db.query(sql0, id, (err, result) => {
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
      db.query(sql, [updateContent, updateContent.id], (err, result) => {
        if (err) return res.cc(err)
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
      db.query(sql, [updateContent, updateContent.id], (err, result) => {
        if (err) return res.cc(err)
        res.send({
          status: 0,
          message: '修改管理员信息成功',
        })
      })
    }
  })
}

// 将管理员降级为普通用户。
exports.changeIdentityToUser = (req, res) => {
  const identity = '用户'
  const sql = 'update users set identity = ? where id = ?'
  db.query(sql, [identity, req.body.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '降级成功',
    })
  })
}

// 为用户分配管理员身份。
exports.changeIdentityToAdmin = (req, res) => {
  const date = new Date()
  const sql = 'update users set identity = ?,update_time = ? where id = ?'
  db.query(sql, [req.body.identity, date, req.body.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '赋权成功',
    })
  })
}

// 按账号和身份搜索用户。
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

// 按部门搜索普通用户。
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

// 冻结用户。
exports.banUser = (req, res) => {
  const status = 1
  const sql = 'update users set status = ? where id = ?'
  db.query(sql, [status, req.body.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '冻结成功',
    })
  })
}

// 解冻用户。
exports.hotUser = (req, res) => {
  const status = 0
  const sql = 'update users set status = ? where id = ?'
  db.query(sql, [status, req.body.id], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '解冻成功',
    })
  })
}

// 获取冻结用户列表。
exports.getBanList = (req, res) => {
  const sql = 'select * from users where status = "1" '
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 删除用户及其头像绑定记录。
exports.deleteUser = (req, res) => {
  const sql = 'delete from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    const sql1 = 'delete from image where account = ?'
    db.query(sql1, req.body.account, (err, result) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '删除用户成功',
      })
    })
  })
}

// 获取指定身份总人数。
exports.getAdminListLength = (req, res) => {
  const sql = 'select * from users where identity = ? '
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

// 分页获取用户列表，每页 10 条。
exports.returnListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from users where identity = ? ORDER BY create_time limit 10 offset ${number} `
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
