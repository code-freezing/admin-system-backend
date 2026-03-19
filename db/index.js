const mysql = require('mysql')

// 使用连接池统一管理数据库连接，避免每次请求都新建连接。
const db = mysql.createPool({
  host: 'localhost',
  user: 'back_system',
  password: '123456',
  database: 'back_system',
})

module.exports = db
