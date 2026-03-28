/**
 * 模块说明：
 * 1. 系统概览业务处理层。
 * 2. 负责查询首页图表、统计数字和排行等聚合数据。
 * 3. 前端概览页的多个板块都直接依赖这里。
 */

const db = require('../db/index')

const query = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) {
        reject(err)
        return
      }

      resolve(results)
    })
  })

const COMPANY_ROLE_ORDER = ['超级管理员', '产品管理员', '用户管理员', '消息管理员', '用户']
const MESSAGE_LEVEL_ORDER = ['一般', '重要', '必要', '紧急']

const parseCategoryConfig = (value) => {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    try {
      const fallback = Function(`return (${value})`)()
      return Array.isArray(fallback) ? fallback : []
    } catch {
      return []
    }
  }
}

// 概览页统计接口负责把零散业务表整理成图表友好的结构。
// 这里改成聚合查询，避免单页统计触发大量循环 SQL。

exports.getCategoryAndNumber = async (req, res) => {
  try {
    const [settingRows, categoryRows] = await Promise.all([
      query('select set_value from setting where set_name = ? limit 1', ['产品设置']),
      query(
        `
          select product_category, coalesce(sum(product_all_price), 0) as total_price
          from product
          group by product_category
        `,
      ),
    ])

    const category = parseCategoryConfig(settingRows[0]?.set_value)
    const priceMap = new Map(
      categoryRows.map((item) => [item.product_category, Number(item.total_price || 0)]),
    )

    res.send({
      category,
      price: category.map((item) => priceMap.get(item) || 0),
    })
  } catch (error) {
    res.cc(error)
  }
}

exports.getAdminAndNumber = async (req, res) => {
  try {
    const rows = await query(
      `
        select identity, count(*) as total
        from users
        group by identity
      `,
    )

    const countMap = new Map(rows.map((item) => [item.identity, Number(item.total || 0)]))
    res.send({
      data: COMPANY_ROLE_ORDER.map((name) => ({
        name,
        value: countMap.get(name) || 0,
      })),
    })
  } catch (error) {
    res.cc(error)
  }
}

exports.getLevelAndNumber = async (req, res) => {
  try {
    const rows = await query(
      `
        select message_level, count(*) as total
        from message
        where message_status = 0
        group by message_level
      `,
    )

    const countMap = new Map(rows.map((item) => [item.message_level, Number(item.total || 0)]))
    const allLevels = [
      ...MESSAGE_LEVEL_ORDER,
      ...rows
        .map((item) => item.message_level)
        .filter((level) => level && !MESSAGE_LEVEL_ORDER.includes(level)),
    ]

    res.send({
      data: allLevels.map((name) => ({
        name,
        value: countMap.get(name) || 0,
      })),
    })
  } catch (error) {
    res.cc(error)
  }
}

// 近七天登录图会回溯最近 7 个自然日，并统计 login_log 中每天的记录数量。
exports.getDayAndNumber = async (req, res) => {
  try {
    const rows = await query(
      `
        select date(login_time) as login_day, count(*) as total
        from login_log
        where login_time >= date_sub(curdate(), interval 6 day)
        group by date(login_time)
        order by login_day asc
      `,
    )

    const countMap = new Map(
      rows.map((item) => {
        const key = item.login_day instanceof Date ? item.login_day.toISOString().slice(0, 10) : item.login_day
        return [key, Number(item.total || 0)]
      }),
    )

    const week = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      return date.toISOString().slice(0, 10)
    })

    res.send({
      week,
      number: week.map((day) => countMap.get(day) || 0),
    })
  } catch (error) {
    res.cc(error)
  }
}
