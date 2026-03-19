const db = require('../db/index.js')
const fs = require('fs')

// 上传并更新轮播图配置。
exports.uploadSwiper = (req, res) => {
  let oldName = req.files[0].filename
  let newName = Buffer.from(req.files[0].originalname, 'latin1').toString('utf8')
  fs.renameSync('./public/upload/' + oldName, './public/upload/' + newName)
  const sql = 'update setting set set_value = ? where set_name = ?'
  db.query(sql, [`http://127.0.0.1:3007/upload/${newName}`, req.body.name], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '上传轮播图成功',
    })
  })
}

// 获取全部轮播图地址。
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

// 获取公司名称。
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

// 修改公司名称。
exports.changeCompanyName = (req, res) => {
  const sql = 'update setting set set_value = ? where set_name = "公司名称"'
  db.query(sql, req.body.set_value, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改公司成功',
    })
  })
}

// 修改公司介绍文案。
exports.changeCompanyIntroduce = (req, res) => {
  const sql = 'update setting set set_text = ? where set_name = ? '
  db.query(sql, [req.body.set_text, req.body.set_name], (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '修改公司介绍成功',
    })
  })
}

// 获取指定公司介绍内容。
exports.getCompanyIntroduce = (req, res) => {
  const sql = 'select * from setting where set_name = ?'
  db.query(sql, req.body.set_name, (err, result) => {
    if (err) return res.cc(err)
    res.send(result[0].set_text)
  })
}

// 获取全部公司信息配置。
exports.getAllCompanyIntroduce = (req, res) => {
  const sql = 'select * from setting where set_name like "公司%" '
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    result = result.slice(1)
    res.send(result)
  })
}

// 更新部门配置。
exports.setDepartment = (req, res) => {
  const sql = 'update setting set set_value = ? where set_name = "部门设置" '
  db.query(sql, req.body.set_value, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '部门设置成功',
    })
  })
}

// 获取部门配置。
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

// 更新产品分类配置。
exports.setProduct = (req, res) => {
  const sql = 'update setting set set_value = ? where set_name = "产品设置" '
  db.query(sql, req.body.set_value, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '产品设置成功',
    })
  })
}

// 获取产品分类配置。
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
