const db = require('../db/index.js')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const fs = require('fs')
const {
  getRoleCodeByIdentity,
  hasAnyPermission,
  hasPermission,
  replaceUserRoles,
} = require('../services/access_control')
const USER_SAFE_COLUMNS = `
  id,
  account,
  name,
  sex,
  department,
  email,
  identity,
  image_url,
  create_time,
  update_time,
  status,
  read_status,
  read_list
`
const USER_AUTH_COLUMNS = `
  id,
  account,
  password,
  name,
  sex,
  department,
  email,
  identity,
  image_url,
  create_time,
  update_time,
  status,
  read_status,
  read_list
`

// 用户信息模块同时承载个人资料、找回密码和后台用户管理等能力。
// 这里的大多数接口直接操作 users 表，少量会联动 image 表中的头像记录。
const sendStatus = (res, status, message, extra = {}) => {
  res.send({
    status,
    message,
    ...extra,
  })
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
const deny = (res) => res.status(403).send({ status: 403, message: '无权限访问' })

// 更新用户，保持页面状态和实际数据一致。
const updateUserField = (res, id, field, value) => {
  const sql = `update users set ${field} = ? where id = ?`
  db.query(sql, [value, id], (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '修改成功')
  })
}

// 加载用户，让后续逻辑直接复用准备好的数据。
const loadIdentityByUserId = (id) => {
  return new Promise((resolve, reject) => {
    db.query('select identity from users where id = ? limit 1', [id], (err, result) => {
      if (err) {
        reject(err)
        return
      }

      resolve(result[0]?.identity || null)
    })
  })
}

// 处理已读信息，把当前模块的关键逻辑集中在这里。
const canReadIdentity = (req, identity) => {
  if (identity === '用户') {
    return hasAnyPermission(req.accessContext, ['api.user.user.read', 'api.user.admin.read'])
  }

  return hasPermission(req.accessContext, 'api.user.admin.read')
}

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
        sendStatus(res, 0, '修改成功')
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
      sendStatus(res, 0, '修改成功')
    })
  })
}

// 获取当前用户资料时会把 password 清空，避免前端拿到哈希值。
exports.getUserInfo = (req, res) => {
  const currentUserId = req.accessContext?.user?.id
  const targetUserId = Number(req.body.id)
  const canReadOthers = hasAnyPermission(req.accessContext, [
    'api.user.user.read',
    'api.user.admin.read',
  ])

  if (currentUserId !== targetUserId && !canReadOthers) {
    return deny(res)
  }

  const sql = `select ${USER_AUTH_COLUMNS} from users where id = ? limit 1`
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)
    if (result.length !== 1) {
      return sendStatus(res, 1, '用户不存在')
    }
    result[0].password = ''
    res.send(result[0])
  })
}

// 以下三个接口分别修改昵称、性别和邮箱，保持页面保存粒度简单明确。
exports.changeName = (req, res) => {
  const { id, name } = req.body
  updateUserField(res, id, 'name', name)
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
exports.changeSex = (req, res) => {
  const { id, sex } = req.body
  updateUserField(res, id, 'sex', sex)
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
exports.changeEmail = (req, res) => {
  const { id, email } = req.body
  updateUserField(res, id, 'email', email)
}

// 登录页找回密码前，先校验账号和邮箱是否匹配。
exports.verifyAccountAndEmail = (req, res) => {
  const { account, email } = req.body
  const sql = 'select id, email from users where account = ? limit 1'
  db.query(sql, account, (err, result) => {
    if (err) return res.cc(err)
    if (result.length !== 1) {
      return sendStatus(res, 1, '查询失败')
    }
    if (email == result[0].email) {
      sendStatus(res, 0, '查询成功', { id: result[0].id })
    } else {
      sendStatus(res, 1, '查询失败')
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
    sendStatus(res, 0, '更新成功')
  })
}

// 后台用户管理从这里开始，支持创建管理员和后续权限调整。
exports.createAdmin = (req, res) => {
  const { account, password, name, sex, department, email, identity } = req.body
  const sql = 'select id from users where account = ? limit 1'
  db.query(sql, account, (err, results) => {
    if (err) return res.cc(err)
    if (results.length > 0) {
      return sendStatus(res, 1, '账号已存在')
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
          return sendStatus(res, 1, '添加管理员失败')
        }

        replaceUserRoles(insertResult.insertId, [getRoleCodeByIdentity(identity)]).catch(() => {})

        sendStatus(res, 0, '添加管理员成功')
      }
    )
  })
}

// 列表返回前会抹掉不需要给表格展示的敏感字段。
exports.getAdminList = (req, res) => {
  if (!canReadIdentity(req, req.body.identity)) {
    return deny(res)
  }

  const sql = `
    select ${USER_SAFE_COLUMNS}
    from users
    where identity = ?
    order by create_time desc
  `
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 如果编辑时变更了部门，需要清空未读消息状态，避免旧部门消息继续挂在账号上。
exports.editAdmin = async (req, res) => {
  const { id, name, sex, email, department } = req.body
  const date = new Date()
  try {
    const targetIdentity = await loadIdentityByUserId(id)
    const allowEdit =
      targetIdentity === '用户'
        ? hasAnyPermission(req.accessContext, ['api.user.user.edit', 'api.user.admin.edit'])
        : hasPermission(req.accessContext, 'api.user.admin.edit')

    if (!allowEdit) {
      return deny(res)
    }
  } catch (error) {
    return res.cc(error)
  }

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
        sendStatus(res, 0, '修改管理员信息成功')
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
        sendStatus(res, 0, '修改管理员信息成功')
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
    replaceUserRoles(req.body.id, [getRoleCodeByIdentity(identity)]).catch(() => {})
    sendStatus(res, 0, '降级成功')
  })
}

// 普通用户升级为管理员时顺带刷新更新时间，方便后续审计。
exports.changeIdentityToAdmin = (req, res) => {
  const date = new Date()
  const sql = 'update users set identity = ?,update_time = ? where id = ?'
  db.query(sql, [req.body.identity, date, req.body.id], (err) => {
    if (err) return res.cc(err)
    replaceUserRoles(req.body.id, [getRoleCodeByIdentity(req.body.identity)]).catch(() => {})
    sendStatus(res, 0, '赋权成功')
  })
}

// 查询接口按账号、身份和部门拆开，页面可以按不同筛选条件单独调用。
exports.searchUser = (req, res) => {
  const { account, identity } = req.body
  if (!canReadIdentity(req, identity)) {
    return deny(res)
  }

  const sql = `
    select ${USER_SAFE_COLUMNS}
    from users
    where account = ?
      and identity = ?
    limit 10
  `
  db.query(sql, [account, identity], (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 查询用户部门，按当前条件筛出目标结果。
exports.searchUserByDepartment = (req, res) => {
  const sql = `
    select ${USER_SAFE_COLUMNS}
    from users
    where department = ?
      and identity = '用户'
    order by create_time desc
  `
  db.query(sql, req.body.department, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 冻结和解冻通过 status 字段控制，不直接删除账号数据。
exports.banUser = (req, res) => {
  const status = 1
  const sql = 'update users set status = ? where id = ?'
  db.query(sql, [status, req.body.id], (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '冻结成功')
  })
}

// 处理用户，把当前模块的关键逻辑集中在这里。
exports.hotUser = (req, res) => {
  const status = 0
  const sql = 'update users set status = ? where id = ?'
  db.query(sql, [status, req.body.id], (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '解冻成功')
  })
}

// 获取列表，让后续逻辑统一使用这一份结果。
exports.getBanList = (req, res) => {
  const sql = `
    select ${USER_SAFE_COLUMNS}
    from users
    where status = 1
    order by update_time desc, create_time desc
  `
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
      db.query('delete from sys_user_roles where user_id = ?', req.body.id, () => {})
      sendStatus(res, 0, '删除用户成功')
    })
  })
}

// 列表总数和分页数据分开返回，方便前端分页组件复用。
exports.getAdminListLength = (req, res) => {
  if (!canReadIdentity(req, req.body.identity)) {
    return deny(res)
  }

  const sql = 'select count(*) as total from users where identity = ? '
  db.query(sql, req.body.identity, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

// 返回列表数据，让上层直接消费最终结果。
exports.returnListData = (req, res) => {
  if (!canReadIdentity(req, req.body.identity)) {
    return deny(res)
  }

  const number = (req.body.pager - 1) * 10
  const sql = `
    select ${USER_SAFE_COLUMNS}
    from users
    where identity = ?
    order by create_time desc
    limit 10 offset ?
  `
  db.query(sql, [req.body.identity, number], (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
