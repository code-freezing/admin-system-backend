const db = require('../db/index.js')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const jwtconfig = require('../jwt_config/index.js')

// 注册账号。
exports.register = (req, res) => {
  const regInfo = req.body

  if (!regInfo.account || !regInfo.password) {
    return res.send({
      status: 1,
      message: '账号或者密码不能为空',
    })
  }

  const querySql = 'select * from users where account = ?'
  db.query(querySql, regInfo.account, (err, results) => {
    if (err) return res.cc(err)

    if (results.length > 0) {
      return res.send({
        status: 1,
        message: '账号已存在',
      })
    }

    const hashedPassword = bcrypt.hashSync(regInfo.password, 10)
    const insertSql = 'insert into users set ?'

    db.query(
      insertSql,
      {
        account: regInfo.account,
        password: hashedPassword,
        identity: '用户',
        create_time: new Date(),
        status: 0,
      },
      (insertErr, insertResult) => {
        if (insertErr) return res.cc(insertErr)

        if (insertResult.affectedRows !== 1) {
          return res.send({
            status: 1,
            message: '注册账号失败',
          })
        }

        res.send({
          status: 0,
          message: '注册账号成功',
        })
      }
    )
  })
}

// 登录并签发访问令牌。
exports.login = (req, res) => {
  const logInfo = req.body
  const sql = 'select * from users where account = ?'

  db.query(sql, logInfo.account, (err, results) => {
    if (err) return res.cc(err)
    if (results.length !== 1) return res.cc('登录失败')

    const compareResult = bcrypt.compareSync(logInfo.password, results[0].password)
    if (!compareResult) {
      return res.cc('登录失败')
    }

    if (results[0].status == 1) {
      return res.cc('账号被冻结')
    }

    const user = {
      ...results[0],
      password: '',
      imageUrl: '',
      create_time: '',
      update_time: '',
    }

    const tokenStr = jwt.sign(user, jwtconfig.jwtSecretKey, {
      expiresIn: '7h',
    })

    res.send({
      results: results[0],
      status: 0,
      message: '登录成功',
      token: 'Bearer ' + tokenStr,
    })
  })
}

// 超级管理员菜单。
const superAdminRouter = [
  {
    name: 'home',
    path: '/home',
    meta: { title: '首页' },
    component: 'home/index',
  },
  {
    name: 'set',
    path: '/set',
    meta: { title: '设置' },
    component: 'set/index',
  },
  {
    name: 'overview',
    path: '/overview',
    meta: { title: '系统概览' },
    component: 'overview/index',
  },
  {
    name: 'product_manage',
    path: '/product_manage',
    meta: { title: '产品管理员' },
    component: 'user_manage/product_manage/index',
  },
  {
    name: 'message_manage',
    path: '/message_manage',
    meta: { title: '消息管理员' },
    component: 'user_manage/message_manage/index',
  },
  {
    name: 'user_list',
    path: '/user_list',
    meta: { title: '用户列表' },
    component: 'user_manage/user_list/index',
  },
  {
    name: 'users_manage',
    path: '/users_manage',
    meta: { title: '用户管理' },
    component: 'user_manage/users_manage/index',
  },
  {
    name: 'product_manage_list',
    path: '/product_manage_list',
    meta: { title: '产品管理' },
    component: 'product/product_manage_list/index',
  },
  {
    name: 'out_product_manage_list',
    path: '/out_product_manage_list',
    meta: { title: '出库管理' },
    component: 'product/out_product_manage_list/index',
  },
  {
    name: 'message_list',
    path: '/message_list',
    meta: { title: '消息管理' },
    component: 'message/message_list/index',
  },
  {
    name: 'recycle',
    path: '/recycle',
    meta: { title: '回收站' },
    component: 'message/recycle/index',
  },
  {
    name: 'file',
    path: '/file',
    meta: { title: '文件管理' },
    component: 'file/index',
  },
  {
    name: 'operation_log',
    path: '/operation_log',
    meta: { title: '操作日志' },
    component: 'operation_log/index',
  },
  {
    name: 'login_log',
    path: '/login_log',
    meta: { title: '登录日志' },
    component: 'login_log/index',
  },
]

// 用户管理员菜单。
const userAdminRouter = [
  {
    name: 'home',
    path: '/home',
    meta: { title: '首页' },
    component: 'home/index',
  },
  {
    name: 'set',
    path: '/set',
    meta: { title: '设置' },
    component: 'set/index',
  },
  {
    name: 'user_list',
    path: '/user_list',
    meta: { title: '用户列表' },
    component: 'user_manage/user_list/index',
  },
  {
    name: 'users_manage',
    path: '/users_manage',
    meta: { title: '用户管理' },
    component: 'user_manage/users_manage/index',
  },
  {
    name: 'file',
    path: '/file',
    meta: { title: '文件管理' },
    component: 'file/index',
  },
]

// 产品管理员菜单。
const productAdminRouter = [
  {
    name: 'home',
    path: '/home',
    meta: { title: '首页' },
    component: 'home/index',
  },
  {
    name: 'set',
    path: '/set',
    meta: { title: '设置' },
    component: 'set/index',
  },
  {
    name: 'product_manage_list',
    path: '/product_manage_list',
    meta: { title: '产品管理' },
    component: 'product/product_manage_list/index',
  },
  {
    name: 'out_product_manage_list',
    path: '/out_product_manage_list',
    meta: { title: '出库管理' },
    component: 'product/out_product_manage_list/index',
  },
  {
    name: 'file',
    path: '/file',
    meta: { title: '文件管理' },
    component: 'file/index',
  },
]

// 消息管理员菜单。
const messageAdminRouter = [
  {
    name: 'home',
    path: '/home',
    meta: { title: '首页' },
    component: 'home/index',
  },
  {
    name: 'set',
    path: '/set',
    meta: { title: '设置' },
    component: 'set/index',
  },
  {
    name: 'message_list',
    path: '/message_list',
    meta: { title: '消息管理' },
    component: 'message/message_list/index',
  },
  {
    name: 'recycle',
    path: '/recycle',
    meta: { title: '回收站' },
    component: 'message/recycle/index',
  },
  {
    name: 'file',
    path: '/file',
    meta: { title: '文件管理' },
    component: 'file/index',
  },
]

// 普通用户菜单。
const userRouter = [
  {
    name: 'home',
    path: '/home',
    meta: { title: '首页' },
    component: 'home/index',
  },
  {
    name: 'set',
    path: '/set',
    meta: { title: '设置' },
    component: 'set/index',
  },
  {
    name: 'product_manage_list',
    path: '/product_manage_list',
    meta: { title: '产品管理' },
    component: 'product/product_manage_list/index',
  },
  {
    name: 'out_product_manage_list',
    path: '/out_product_manage_list',
    meta: { title: '出库管理' },
    component: 'product/out_product_manage_list/index',
  },
  {
    name: 'file',
    path: '/file',
    meta: { title: '文件管理' },
    component: 'file/index',
  },
]

// 按用户身份返回菜单。
exports.returnMenuList = (req, res) => {
  const sql = 'select identity from users where id = ?'
  db.query(sql, req.body.id, (err, result) => {
    if (err) return res.cc(err)

    let menu = []
    if (result[0].identity == '超级管理员') {
      menu = superAdminRouter
    }
    if (result[0].identity == '用户管理员') {
      menu = userAdminRouter
    }
    if (result[0].identity == '产品管理员') {
      menu = productAdminRouter
    }
    if (result[0].identity == '消息管理员') {
      menu = messageAdminRouter
    }
    if (result[0].identity == '用户') {
      menu = userRouter
    }

    res.send(menu)
  })
}
