/**
 * 模块说明：
 * 1. 系统概览业务处理层。
 * 2. 负责查询首页图表、统计数字和排行等聚合数据。
 * 3. 前端概览页的多个板块都直接依赖这里。
 */

const db = require('../db/index')
const moment = require('moment')

// 概览页统计接口负责把零散业务表整理成图表友好的结构。
// 这里多数查询都保持简单，优先服务页面展示而不是做复杂报表。

// 先读取产品分类配置，再逐类汇总库存总价。
exports.getCategoryAndNumber = (req, res) => {
  const loadCategoryArray = () => {
    return new Promise((resolve) => {
      const sql = 'select set_value from setting where set_name = "产品设置"'
      db.query(sql, (err, result) => {
        if (err) return resolve([])
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
        if (err) return resolve(0)
        let total = 0
        for (let i = 0; i < result.length; i++) {
          total += result[i].product_all_price
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

// 身份分布图固定几个角色名称，便于前端直接渲染饼图。
exports.getAdminAndNumber = (req, res) => {
  const loadCountByIdentity = (identity) => {
    return new Promise((resolve) => {
      const sql = 'select * from users where identity = ?'
      db.query(sql, identity, (err, result) => {
        if (err) return resolve(0)
        resolve(result.length)
      })
    })
  }

  async function getAll() {
    const data = [
      { value: 0, name: '超级管理员' },
      { value: 0, name: '产品管理员' },
      { value: 0, name: '用户管理员' },
      { value: 0, name: '消息管理员' },
      { value: 0, name: '用户' },
    ]

    for (let i = 0; i < data.length; i++) {
      data[i].value = await loadCountByIdentity(data[i].name)
    }

    res.send({
      data,
    })
  }

  getAll()
}

exports.getLevelAndNumber = (req, res) => {
  const loadCountByLevel = (messageLevel) => {
    return new Promise((resolve) => {
      const sql = 'select * from message where message_level = ?'
      db.query(sql, messageLevel, (err, result) => {
        if (err) return resolve(0)
        resolve(result.length)
      })
    })
  }

  async function getAll() {
    const data = [
      { value: 0, name: '一般' },
      { value: 0, name: '重要' },
      { value: 0, name: '必要' },
    ]

    for (let i = 0; i < data.length; i++) {
      data[i].value = await loadCountByLevel(data[i].name)
    }

    res.send({
      data,
    })
  }

  getAll()
}

// 近七天登录图会回溯 7 个自然日，并统计 login_log 中每天的记录数量。
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
        if (err) return resolve(0)
        resolve(result.length)
      })
    })
  }

  async function getAll() {
    const week = getRecentDays()
    const number = []
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
