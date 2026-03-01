const express = require('express')

const app = express()

const bodyParser = require('body-parser')

const cors = require('cors')
app.use(cors())

// parse application/x-www-form-urlencoded
// extended: false，值为数组或字符串，如果为true，则值为任意类型
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// 导入路由模块
const loginRouter = require('./router/login')
app.use('/api', loginRouter)

// 绑定和监听指定端口
app.listen(3007, () => {
  console.log('http://127.0.0.1:3007')
})