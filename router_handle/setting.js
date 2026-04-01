const db = require('../db/index.js')
const fs = require('fs')

// 设置模块集中维护轮播图、公司信息、部门配置和产品分类配置。
// 多数配置都落在 setting 表，通过 set_name 区分具体配置项。
// 前端主要对应 views/set/index.vue，以及首页读取展示数据时用到的部分接口。
const sendStatus = (res, status, message, extra = {}) => {
  res.send({
    status,
    message,
    ...extra,
  })
}

// 处理当前文件操作，把文件保存到约定位置后再继续后续流程。
exports.uploadSwiper = (req, res) => {
  let oldName = req.files[0].filename
  let newName = Buffer.from(req.files[0].originalname, 'latin1').toString('utf8')
  fs.renameSync('./public/upload/' + oldName, './public/upload/' + newName)
  const sql = 'update setting set set_value = ? where set_name = ?'
  db.query(sql, [`http://127.0.0.1:3007/upload/${newName}`, req.body.name], (err) => {
    if (err) return res.cc(err)
    // 前端上传轮播图时会把 swiper1~swiper6 这样的 name 一起带过来，
    // 后端据此更新对应配置项，而不是新插入一条记录。
    sendStatus(res, 0, '上传轮播图成功')
  })
}

// 轮播图在数据库中分散为多条 swiper 配置，这里统一整理成数组返回给前端。
exports.getAllSwiper = (req, res) => {
  // 设置页的“首页管理”和首页轮播图展示，最终都依赖这一个数组返回格式。
  const sql = "select set_value from setting where set_name like 'swiper%' "
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result) {
      const array = []
      result.forEach((e) => {
        array.push(e.set_value)
      })
      res.send(array)
    } else {
      sendStatus(res, 1, '请添加轮播图')
    }
  })
}

// 获取名称，让后续逻辑统一使用这一份结果。
exports.getCompanyName = (req, res) => {
  // 对应设置页“公司名称”输入框，以及首页中可能显示公司名称的区域。
  const sql = 'select * from setting where set_name = "公司名称"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].set_value) {
      res.send(result[0].set_value)
    } else {
      sendStatus(res, 1, '请设置公司名称')
    }
  })
}

// 处理名称，把当前模块的关键逻辑集中在这里。
exports.changeCompanyName = (req, res) => {
  // 这是最简单的一类 setting 更新：只改 set_value，不涉及富文本或文件。
  const sql = 'update setting set set_value = ? where set_name = "公司名称"'
  db.query(sql, req.body.set_value, (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '修改公司名称成功')
  })
}

// 公司介绍类配置使用 set_text，适合存储较长文案。
exports.changeCompanyIntroduce = (req, res) => {
  // 前端 editor.vue 会传入 set_name，后端用它定位“公司简介/公司愿景/企业文化/公司概览”中的哪一项。
  const sql = 'update setting set set_text = ? where set_name = ? '
  db.query(sql, [req.body.set_text, req.body.set_name], (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '修改公司介绍成功')
  })
}

// 获取当前结果，让后续逻辑统一使用这一份数据。
exports.getCompanyIntroduce = (req, res) => {
  // 富文本编辑弹窗打开时会先读取对应 set_name 的当前内容。
  const sql = 'select * from setting where set_name = ?'
  db.query(sql, req.body.set_name, (err, result) => {
    if (err) return res.cc(err)
    res.send(result[0].set_text)
  })
}

// 获取当前结果，让后续逻辑统一使用这一份数据。
exports.getAllCompanyIntroduce = (req, res) => {
  // 首页公司信息区只展示与设置页一一对应的四项配置，
  // 并且按固定顺序返回，避免再把旧字段“公司架构/公司战略/公司高层”混进来。
  const sql = `
    select *
    from setting
    where set_name in ("公司简介", "公司愿景", "企业文化", "公司概览")
    order by field(set_name, "公司简介", "公司愿景", "企业文化", "公司概览")
  `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 部门和产品配置本质上都是一段结构化字符串，供前端下拉框和统计图使用。
exports.setDepartment = (req, res) => {
  // 设置页字典维护采用“整体覆盖保存”，后端不做单条增删接口拆分。
  const sql = 'update setting set set_value = ? where set_name = "部门设置" '
  db.query(sql, req.body.set_value, (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '部门设置成功')
  })
}

// 获取部门，让后续逻辑统一使用这一份结果。
exports.getDepartment = (req, res) => {
  // 消息发布弹窗、用户资料、统计页等都会依赖这里返回的部门配置。
  const sql = 'select set_value from setting where set_name = "部门设置"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].set_value) {
      res.send(result[0].set_value)
    } else {
      sendStatus(res, 1, '请设置公司部门')
    }
  })
}

// 更新产品，避免状态分散在多个位置维护。
exports.setProduct = (req, res) => {
  // 产品分类字典和部门字典采用同一种存储策略，只是 set_name 不同。
  const sql = 'update setting set set_value = ? where set_name = "产品设置" '
  db.query(sql, req.body.set_value, (err) => {
    if (err) return res.cc(err)
    sendStatus(res, 0, '产品设置成功')
  })
}

// 获取产品，让后续逻辑统一使用这一份结果。
exports.getProduct = (req, res) => {
  // 产品入库/编辑页面里的分类下拉框，会读取这份产品分类配置。
  const sql = 'select set_value from setting where set_name = "产品设置"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].set_value) {
      res.send(result[0].set_value)
    } else {
      sendStatus(res, 1, '请设置产品种类')
    }
  })
}
