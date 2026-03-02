const express = require('express')

const app = express()

const bodyParser = require('body-parser')

const Joi = require('joi')

const cors = require('cors')
app.use(cors())

// parse application/x-www-form-urlencoded
// extended: false，值为数组或字符串，如果为true，则值为任意类型
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use((req, res, next) => {
	// status=0为成功,=1为失败,默认设为1,方便处理失败的情况
	res.cc = (err, status = 1) => {
		res.send({
			status,
			// 判断这个error是错误对象还是字符串
			message: err instanceof Error ? err.message : err,
		})
	}
	next()
})

const jwtconfig = require('./jwt_config/index.js')
const { expressjwt: jwt} = require('express-jwt')
app.use(jwt({
	secret:jwtconfig.jwtSecretKey,algorithms:['HS256']
}).unless({
	path:[/^\/api\//]
}))

// 导入路由模块
const loginRouter = require('./router/login')
app.use('/api', loginRouter)

// 对不符合joi规则的情况进行报错
app.use((err,req, res, next) => {
	if (err instanceof Joi.ValidationError){
		res.send({
			status: 1,
			message:'输入的数据不符合验证规则'
		})
	}
})

// 绑定和监听指定端口
app.listen(3007, () => {
  console.log('http://127.0.0.1:3007')
})