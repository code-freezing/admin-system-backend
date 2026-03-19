const db = require('../db/index')
const moment = require('moment')

// 统计各产品类别对应的库存总价。
exports.getCategoryAndNumber = (req, res) => {
  const loadCategoryArray = () => {
    return new Promise((resolve) => {
      const sql = 'select set_value from setting where set_name = "产品设置"'
      db.query(sql, (err, result) => {
        const str = result[0].set_value
        const arr = eval('(' + str + ')')
        resolve(arr)
      })
    })
  }

  const loadTotalPriceByCategory = (productCategory) => {
    return new Promise((resolve) => {
      const sql = 'select product_all_price from product where product_category= ?'
      db.query(sql, productCategory, (err, result) => {
        let total = 0
        for (let i = 0; i < result.length; i++) {
          total += result[i]['product_all_price']
        }
        resolve(total)
      })
    })
  }

  async function getAll() {
    const category = await loadCategoryArray()
    const price = []
    for (let i = 0; i < category.length; i++) {
      price[i] = await loadTotalPriceByCategory(category[i])
    }
    res.send({
      category,
      price,
    })
  }

  getAll()
}

// 统计各角色人数。
exports.getAdminAndNumber = (req, res) => {
  const loadCountByIdentity = (identity) => {
    return new Promise((resolve) => {
      const sql = 'select * from users where identity = ?'
      db.query(sql, identity, (err, result) => {
        resolve(result.length)
      })
    })
  }

  async function getAll() {
    const data = [
      {
        value: 0,
        name: '超级管理员',
      },
      {
        value: 0,
        name: '产品管理员',
      },
      {
        value: 0,
        name: '用户管理员',
      },
      {
        value: 0,
        name: '消息管理员',
      },
      {
        value: 0,
        name: '用户',
      },
    ]

    for (let i = 0; i < data.length; i++) {
      data[i]['value'] = await loadCountByIdentity(data[i]['name'])
    }

    res.send({
      data,
    })
  }

  getAll()
}

// 统计各消息等级数量。
exports.getLevelAndNumber = (req, res) => {
  const loadCountByLevel = (messageLevel) => {
    return new Promise((resolve) => {
      const sql = 'select * from message where message_level = ?'
      db.query(sql, messageLevel, (err, result) => {
        resolve(result.length)
      })
    })
  }

  async function getAll() {
    const data = [
      {
        value: 0,
        name: '一般',
      },
      {
        value: 0,
        name: '重要',
      },
      {
        value: 0,
        name: '必要',
      },
    ]

    for (let i = 0; i < data.length; i++) {
      data[i]['value'] = await loadCountByLevel(data[i]['name'])
    }

    res.send({
      data,
    })
  }

  getAll()
}

// 统计最近七天每日登录数。
exports.getDayAndNumber = (req, res) => {
  const getRecentDays = () => {
    let day = new Date()
    let week = []
    for (let i = 0; i < 7; i++) {
      day.setDate(day.getDate() - 1)
      week.push(
        moment(day.toLocaleDateString().replace(/\//g, '-'), 'YYYY-MM-DD').format('YYYY-MM-DD')
      )
    }
    return week
  }

  const loadLoginCountByDay = (loginDay) => {
    return new Promise((resolve) => {
      const sql = `select * from login_log where login_time like '%${loginDay}%'`
      db.query(sql, loginDay, (err, result) => {
        resolve(result.length)
      })
    })
  }

  async function getAll() {
    const week = getRecentDays()
    let number = []
    for (let i = 0; i < week.length; i++) {
      number[i] = await loadLoginCountByDay(week[i])
    }

    res.send({
      number,
      week,
    })
  }

  getAll()
}
