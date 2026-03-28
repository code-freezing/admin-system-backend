/**
 * 模块说明：
 * 1. 数据库连接池。
 * 2. 统一创建 MySQL 连接池，供所有 router_handle 和服务层共享。
 * 3. 把数据库初始化集中后，业务文件就只需要关注查询本身。
 */

const mysql = require('mysql')

// 统一使用连接池管理数据库连接，避免每次请求都重新创建连接。
const db = mysql.createPool({
  host: 'localhost',
  user: 'back_system',
  password: '123456',
  database: 'back_system',
})

module.exports = db
