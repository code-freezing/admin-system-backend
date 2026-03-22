const db = require('../db/index.js')
const fs = require('fs')

// 设置模块集中维护轮播图、公司信息、部门配置和产品分类配置。
// 多数配置都落在 setting 表，通过 set_name 区分具体配置项。

exports.uploadSwiper = (req, res) => {
  let oldName = req.files[0].filename
  let newName = Buffer.from(req.files[0].originalname, 'latin1').toString('utf8')
  fs.renameSync('./public/upload/' + oldName, './public/upload/' + newName)
  const sql = 'update setting set set_value = ? where set_name = ?'
  db.query(sql, [`http://127.0.0.1:3007/upload/${newName}`, req.body.name], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '上传轮播图成功',
    })
  })
}

// 轮播图在数据库中分散为多条 swiper 配置，这里统一整理成数组返回给前端。
exports.getAllSwiper = (req, res) => {
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
      res.send({
        status: 1,
        message: '请添加轮播图',
      })
    }
  })
}

exports.getCompanyName = (req, res) => {
  const sql = 'select * from setting where set_name = "公司名称"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].set_value) {
      res.send(result[0].set_value)
    } else {
      res.send({
        status: 1,
        message: '请设置公司名称',
      })
    }
  })
}

exports.changeCompanyName = (req, res) => {
  const sql = 'update setting set set_value = ? where set_name = "公司名称"'
  db.query(sql, req.body.set_value, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改公司名称成功',
    })
  })
}

// 公司介绍类配置使用 set_text，适合存储较长文案。
exports.changeCompanyIntroduce = (req, res) => {
  const sql = 'update setting set set_text = ? where set_name = ? '
  db.query(sql, [req.body.set_text, req.body.set_name], (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改公司介绍成功',
    })
  })
}

exports.getCompanyIntroduce = (req, res) => {
  const sql = 'select * from setting where set_name = ?'
  db.query(sql, req.body.set_name, (err, result) => {
    if (err) return res.cc(err)
    res.send(result[0].set_text)
  })
}

exports.getAllCompanyIntroduce = (req, res) => {
  const sql = 'select * from setting where set_name like "公司%" '
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    result = result.slice(1)
    res.send(result)
  })
}

// 部门和产品配置本质上都是一段结构化字符串，供前端下拉框和统计图使用。
exports.setDepartment = (req, res) => {
  const sql = 'update setting set set_value = ? where set_name = "部门设置" '
  db.query(sql, req.body.set_value, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '部门设置成功',
    })
  })
}

exports.getDepartment = (req, res) => {
  const sql = 'select set_value from setting where set_name = "部门设置"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].set_value) {
      res.send(result[0].set_value)
    } else {
      res.send({
        status: 1,
        message: '请设置公司部门',
      })
    }
  })
}

exports.setProduct = (req, res) => {
  const sql = 'update setting set set_value = ? where set_name = "产品设置" '
  db.query(sql, req.body.set_value, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '产品设置成功',
    })
  })
}

exports.getProduct = (req, res) => {
  const sql = 'select set_value from setting where set_name = "产品设置"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    if (result[0].set_value) {
      res.send(result[0].set_value)
    } else {
      res.send({
        status: 1,
        message: '请设置产品种类',
      })
    }
  })
}
