const express = require('express')

const router = express.Router()
const loginHandler = require('../router_handle/login')

router.post('/register', loginHandler.resgister)

router.post('/login', loginHandler.login)

module.exports = router