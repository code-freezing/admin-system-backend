const db = require('../db/index')

// 产品模块覆盖入库、出库申请、审核和出库记录查询。
// 这里的数据主表是 product，审核通过后的历史记录会落到 outproduct。

// 创建产品时会同步计算库存总价，避免前端自己维护派生字段。
exports.createProduct = (req, res) => {
  const {
    product_id,
    product_name,
    product_category,
    product_unit,
    product_in_warehouse_number,
    product_single_price,
    product_create_person,
    in_memo,
  } = req.body
  const product_create_time = new Date()
  const product_all_price = product_in_warehouse_number * 1 * product_single_price
  const sql0 = 'select * from product where product_id = ?'
  db.query(sql0, product_id, (err, results) => {
    if (err) return res.cc(err)
    if (results.length > 0) {
      return res.send({
        status: 1,
        message: '产品编号已存在',
      })
    }
    const sql = 'insert into product set ?'
    db.query(
      sql,
      {
        product_id,
        product_name,
        product_category,
        product_unit,
        product_in_warehouse_number,
        product_single_price,
        product_all_price,
        product_create_person,
        product_create_time,
        in_memo,
      },
      (error) => {
        if (error) return res.cc(error)
        res.send({
          status: 0,
          message: '添加产品成功',
        })
      }
    )
  })
}

exports.deleteProduct = (req, res) => {
  const sql = 'delete from product where id = ?'
  db.query(sql, req.body.id, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '删除产品成功',
    })
  })
}

// 编辑产品时同样会重算库存总价，保证金额和数量始终一致。
exports.editProduct = (req, res) => {
  const {
    product_name,
    product_category,
    product_unit,
    product_in_warehouse_number,
    product_single_price,
    in_memo,
    id,
  } = req.body
  const product_update_time = new Date()
  const product_all_price = product_in_warehouse_number * 1 * product_single_price
  const sql =
    'update product set product_name = ?,product_category = ?,product_unit = ?,product_in_warehouse_number = ?,product_single_price = ?,product_all_price = ? ,product_update_time= ?,in_memo = ? where id = ?'
  db.query(
    sql,
    [
      product_name,
      product_category,
      product_unit,
      product_in_warehouse_number,
      product_single_price,
      product_all_price,
      product_update_time,
      in_memo,
      id,
    ],
    (err) => {
      if (err) return res.cc(err)
      res.send({
        status: 0,
        message: '编辑产品信息成功',
      })
    }
  )
}

// 库存列表以当前 product 表为准，数量为 0 的产品也仍然保留记录。
exports.getProductList = (req, res) => {
  const sql = 'select * from product where product_in_warehouse_number>= 0'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 出库申请先占用申请字段，真正扣减库存要等审核同意后才发生。
exports.applyOutProduct = (req, res) => {
  const product_out_status = '申请出库'
  const {
    id,
    product_out_id,
    product_single_price,
    product_out_number,
    product_out_apply_person,
    apply_memo,
  } = req.body
  const product_apply_time = new Date()
  const product_out_price = product_out_number * 1 * product_single_price
  const sql0 = 'select * from product where product_out_id = ?'
  db.query(sql0, product_out_id, (err, result) => {
    if (err) return res.cc(err)
    if (result.length > 0) {
      return res.send({
        status: 1,
        message: '申请出库编号已存在',
      })
    }
    const sql =
      'update product set product_out_status = ?,product_out_id=?,product_out_number=?,product_out_price=?,product_out_apply_person=?,apply_memo=?,product_apply_time= ? where id = ?'
    db.query(
      sql,
      [
        product_out_status,
        product_out_id,
        product_out_number,
        product_out_price,
        product_out_apply_person,
        apply_memo,
        product_apply_time,
        id,
      ],
      (error) => {
        if (error) return res.cc(error)
        res.send({
          status: 0,
          message: '申请出库成功',
        })
      }
    )
  })
}

// 审核列表展示尚未完成出库的申请，包含待审核和被否决的记录。
exports.applyProductList = (req, res) => {
  const sql = 'select * from product where product_out_status not in ("同意")'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.withdrawApplyProduct = (req, res) => {
  const sql =
    'update product set product_out_id = NULL,product_out_status = NULL , product_out_number =NULL,product_out_apply_person=NULL,apply_memo =NULL,product_out_price =NULL,product_apply_time = NULL where id = ?'
  db.query(sql, req.body.id, (err) => {
    if (err) return res.cc(err)
    res.send({
      status: 0,
      message: '撤回申请出库成功',
    })
  })
}

// 同意出库时会新增 outproduct 记录并扣减库存；否决时只保留审批意见。
exports.auditProduct = (req, res) => {
  const {
    id,
    product_out_id,
    product_out_status,
    audit_memo,
    product_out_price,
    product_out_audit_person,
    product_out_apply_person,
    product_in_warehouse_number,
    product_single_price,
    product_out_number,
    product_apply_time,
  } = req.body
  const product_audit_time = new Date()
  if (product_out_status == '同意') {
    const newWarehouseNumber = product_in_warehouse_number * 1 - product_out_number * 1
    const product_all_price = newWarehouseNumber * product_single_price
    const sql = 'insert into outproduct set ?'
    db.query(
      sql,
      {
        product_out_id,
        product_out_number,
        product_out_price,
        product_out_audit_person,
        product_out_apply_person,
        product_audit_time,
        product_apply_time,
        audit_memo,
      },
      (err) => {
        if (err) return res.cc(err)
        const sql1 =
          'update product set product_in_warehouse_number = ?,product_all_price = ?,product_out_status = NULL ,product_out_id = NULL,product_out_number =NULL,product_out_apply_person=NULL,apply_memo =NULL,product_out_price =NULL,product_apply_time = NULL where id = ?'
        db.query(sql1, [newWarehouseNumber, product_all_price, req.body.id], (error) => {
          if (error) return res.cc(error)
          res.send({
            status: 0,
            message: '产品出库成功',
          })
        })
      }
    )
  }
  if (product_out_status == '否决') {
    const sql =
      'update product set audit_memo = ?,product_out_status = ?,product_audit_time= ?,product_out_audit_person = ? where id = ?'
    db.query(
      sql,
      [audit_memo, product_out_status, product_audit_time, product_out_audit_person, id],
      (err) => {
        if (err) return res.cc(err)
        res.send({
          status: 0,
          message: '产品已被否决',
        })
      }
    )
  }
}

// 三个搜索接口分别对应入库编号、申请编号和出库记录编号。
exports.searchProductForId = (req, res) => {
  const sql = 'select * from product where product_id  = ?'
  db.query(sql, req.body.product_id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.searchProductForApplyId = (req, res) => {
  const sql = 'select * from product where product_out_id   = ?'
  db.query(sql, req.body.product_out_id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.searchProductForOutId = (req, res) => {
  const sql = 'select * from outproduct where product_out_id   = ?'
  db.query(sql, req.body.product_out_id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 分页器和表格共用同一套筛选条件，因此总数接口单独提供。
exports.getProductLength = (req, res) => {
  const sql = 'select * from product where product_in_warehouse_number>= 0'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.getApplyProductLength = (req, res) => {
  const sql =
    'select * from product where product_out_status = "申请出库" || product_out_status = "否决"'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.auditProductList = (req, res) => {
  const sql = 'select * from outproduct'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.getOutProductLength = (req, res) => {
  const sql = 'select * from outproduct'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result.length,
    })
  })
}

exports.returnProductListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from product where product_in_warehouse_number>= 0 ORDER BY product_create_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.returnApplyProductListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from product where product_out_status = "申请出库" || product_out_status = "否决" ORDER BY product_apply_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.returnOutProductListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = `select * from outproduct ORDER BY product_audit_time limit 10 offset ${number} `
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
