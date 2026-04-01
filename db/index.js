const mysql = require('mysql')

// 统一使用连接池管理数据库连接，避免每次请求都重新创建连接。
const db = mysql.createPool({
  host: 'localhost',
  user: 'back_system',
  password: '123456',
  database: 'back_system',
})

module.exports = db
