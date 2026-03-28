/**
 * 模块说明：
 * 1. 产品出入库业务处理层。
 * 2. 负责库存入库、出库申请、审核、分页统计和历史记录查询。
 * 3. 产品模块的数据流较长，是理解项目业务的重要入口。
 */

const db = require('../db/index')
const { ROLE_CODES } = require('../services/access_control')
const PRODUCT_COLUMNS = `
  id,
  product_id,
  product_name,
  product_category,
  product_unit,
  product_in_warehouse_number,
  product_single_price,
  product_all_price,
  product_create_person,
  product_create_time,
  product_update_time,
  in_memo,
  product_out_status,
  product_out_id,
  product_out_number,
  product_out_price,
  product_out_apply_person,
  product_out_apply_user_id,
  product_out_apply_account,
  apply_memo,
  audit_memo,
  product_apply_time,
  product_audit_time,
  product_out_audit_person
`
const OUT_PRODUCT_COLUMNS = `
  id,
  product_out_id,
  product_out_number,
  product_out_price,
  product_out_audit_person,
  product_out_apply_person,
  product_out_apply_user_id,
  product_out_apply_account,
  product_audit_time,
  product_apply_time,
  audit_memo
`

// 产品模块覆盖入库、出库申请、审核和出库记录查询。
// 这里的数据主表是 product，审核通过后的历史记录会落到 outproduct。
// 前端对应页面主要是：
// 1. views/product/product_manage_list/index.vue
// 2. views/product/components/apply.vue
// 3. views/product/components/audit.vue

const isEmployee = (req) => {
  return Array.isArray(req.accessContext?.roles) && req.accessContext.roles.includes(ROLE_CODES.EMPLOYEE)
}

const deny = (res) => {
  return res.status(403).send({
    status: 403,
    message: '无权限访问',
  })
}

const getProductRowById = (id) => {
  return new Promise((resolve, reject) => {
    db.query('select * from product where id = ? limit 1', [id], (err, results) => {
      if (err) {
        reject(err)
        return
      }

      resolve(results[0] || null)
    })
  })
}

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
      // 入库编号是库存记录的业务唯一标识，和数据库自增 id 不是一回事。
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
  // 删除的是当前库存记录，不会去碰已经写入 outproduct 的出库历史。
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
  const sql = `
    select ${PRODUCT_COLUMNS}
    from product
    where product_in_warehouse_number >= 0
    order by product_create_time desc
  `
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
    apply_memo,
  } = req.body
  const product_out_apply_person = req.accessContext?.user?.name || req.body.product_out_apply_person
  const product_out_apply_user_id = req.accessContext?.user?.id || null
  const product_out_apply_account = req.accessContext?.user?.account || null
  const product_apply_time = new Date()
  const product_out_price = product_out_number * 1 * product_single_price
  const sql0 = 'select * from product where product_out_id = ?'
  db.query(sql0, product_out_id, (err, result) => {
    if (err) return res.cc(err)
    if (result.length > 0) {
      // 出库编号对应前端“申请编号”，用于追踪一次具体出库流程，因此也要求唯一。
      return res.send({
        status: 1,
        message: '申请出库编号已存在',
      })
    }
    const sql =
      'update product set product_out_status = ?,product_out_id=?,product_out_number=?,product_out_price=?,product_out_apply_person=?,product_out_apply_user_id=?,product_out_apply_account=?,apply_memo=?,product_apply_time= ? where id = ?'
    db.query(
      sql,
      [
        product_out_status,
        product_out_id,
        product_out_number,
        product_out_price,
        product_out_apply_person,
        product_out_apply_user_id,
        product_out_apply_account,
        apply_memo,
        product_apply_time,
        id,
      ],
      (error) => {
        if (error) return res.cc(error)
        // 这里只是在 product 表上“挂起一条申请”，
        // 目的是让审核列表直接从当前库存表就能看到待处理记录。
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
  // 前端“出库管理”标签页展示的就是这批记录。
  // 已经审核同意并真正出库的记录会转到 outproduct，不再出现在这里。
  const sql = isEmployee(req)
    ? `select ${PRODUCT_COLUMNS} from product where product_out_status not in ('同意') and product_out_apply_user_id = ? order by product_apply_time desc`
    : `select ${PRODUCT_COLUMNS} from product where product_out_status not in ('同意') order by product_apply_time desc`
  const values = isEmployee(req) ? [req.accessContext.user.id] : []
  db.query(sql, values, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.withdrawApplyProduct = async (req, res) => {
  // 撤回申请的本质是把这一整组申请态字段恢复为 NULL，
  // 让当前产品重新回到“可再次申请出库”的普通库存状态。
  try {
    const currentRow = await getProductRowById(req.body.id)
    if (!currentRow) {
      return res.send({
        status: 1,
        message: '申请记录不存在',
      })
    }

    if (isEmployee(req) && currentRow.product_out_apply_user_id !== req.accessContext.user.id) {
      return deny(res)
    }
  } catch (error) {
    return res.cc(error)
  }

  const sql =
    'update product set product_out_id = NULL,product_out_status = NULL , product_out_number =NULL,product_out_apply_person=NULL,product_out_apply_user_id=NULL,product_out_apply_account=NULL,apply_memo =NULL,product_out_price =NULL,product_apply_time = NULL where id = ?'
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
    product_out_apply_user_id,
    product_out_apply_account,
    product_in_warehouse_number,
    product_single_price,
    product_out_number,
    product_apply_time,
  } = req.body
  const product_audit_time = new Date()
  if (product_out_status == '同意') {
    // 通过审核后，当前库存记录上的申请字段会被清空，
    // 真正的历史轨迹则转存到 outproduct 表中。
    // 这正好对应前端 audit.vue 中“审核成功后刷新两个标签页”的行为：
    // 1. 库存标签页会看到数量减少
    // 2. 出库申请标签页会少掉当前这条申请
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
          product_out_apply_user_id,
          product_out_apply_account,
          product_audit_time,
          product_apply_time,
          audit_memo,
        },
      (err) => {
        if (err) return res.cc(err)
        const sql1 =
          // 审核通过后只保留更新后的库存数量和金额；
          // 那些一次性的“申请出库”字段必须全部置空，避免影响下一次申请。
          'update product set product_in_warehouse_number = ?,product_all_price = ?,product_out_status = NULL ,product_out_id = NULL,product_out_number =NULL,product_out_apply_person=NULL,product_out_apply_user_id=NULL,product_out_apply_account=NULL,apply_memo =NULL,product_out_price =NULL,product_apply_time = NULL where id = ?'
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
    // 否决时不扣库存，只把审批结论和审批人写回当前产品记录。
    // 被否决的申请仍保留在 product 表，前端可以据此提供“重新申请”入口。
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
  const sql = `select ${PRODUCT_COLUMNS} from product where product_id = ?`
  db.query(sql, req.body.product_id, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.searchProductForApplyId = (req, res) => {
  const sql = isEmployee(req)
    ? `select ${PRODUCT_COLUMNS} from product where product_out_id = ? and product_out_apply_user_id = ?`
    : `select ${PRODUCT_COLUMNS} from product where product_out_id = ?`
  const values = isEmployee(req)
    ? [req.body.product_out_id, req.accessContext.user.id]
    : [req.body.product_out_id]
  db.query(sql, values, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.searchProductForOutId = (req, res) => {
  const sql = isEmployee(req)
    ? `select ${OUT_PRODUCT_COLUMNS} from outproduct where product_out_id = ? and product_out_apply_user_id = ?`
    : `select ${OUT_PRODUCT_COLUMNS} from outproduct where product_out_id = ?`
  const values = isEmployee(req)
    ? [req.body.product_out_id, req.accessContext.user.id]
    : [req.body.product_out_id]
  db.query(sql, values, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

// 分页器和表格共用同一套筛选条件，因此总数接口单独提供。
exports.getProductLength = (req, res) => {
  // 对应前端“入库管理”标签页的分页器总数。
  const sql = 'select count(*) as total from product where product_in_warehouse_number>= 0'
  db.query(sql, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

exports.getApplyProductLength = (req, res) => {
  // 对应前端“出库管理”标签页的分页器总数。
  const sql = isEmployee(req)
    ? 'select count(*) as total from product where (product_out_status = "申请出库" || product_out_status = "否决") and product_out_apply_user_id = ?'
    : 'select count(*) as total from product where product_out_status = "申请出库" || product_out_status = "否决"'
  const values = isEmployee(req) ? [req.accessContext.user.id] : []
  db.query(sql, values, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

exports.auditProductList = (req, res) => {
  // 这个列表对应的是已经完成的历史出库记录，而不是当前待审核申请。
  const sql = isEmployee(req)
    ? `select ${OUT_PRODUCT_COLUMNS} from outproduct where product_out_apply_user_id = ? order by product_audit_time desc`
    : `select ${OUT_PRODUCT_COLUMNS} from outproduct order by product_audit_time desc`
  const values = isEmployee(req) ? [req.accessContext.user.id] : []
  db.query(sql, values, (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.getOutProductLength = (req, res) => {
  const sql = isEmployee(req)
    ? 'select count(*) as total from outproduct where product_out_apply_user_id = ?'
    : 'select count(*) as total from outproduct'
  const values = isEmployee(req) ? [req.accessContext.user.id] : []
  db.query(sql, values, (err, result) => {
    if (err) return res.cc(err)
    res.send({
      length: result[0].total,
    })
  })
}

exports.returnProductListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  // 这里通过 offset 做最基础的分页，前端约定每页固定 10 条。
  const sql = `
    select ${PRODUCT_COLUMNS}
    from product
    where product_in_warehouse_number >= 0
    order by product_create_time desc
    limit 10 offset ?
  `
  db.query(sql, [number], (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.returnApplyProductListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  // “申请出库”和“否决”两种状态都留在这里，
  // 因为前端要允许用户继续看到被驳回的记录并重新申请。
  const sql = isEmployee(req)
    ? `
        select ${PRODUCT_COLUMNS}
        from product
        where (product_out_status = '申请出库' or product_out_status = '否决')
          and product_out_apply_user_id = ?
        order by product_apply_time desc
        limit 10 offset ?
      `
    : `
        select ${PRODUCT_COLUMNS}
        from product
        where product_out_status = '申请出库' or product_out_status = '否决'
        order by product_apply_time desc
        limit 10 offset ?
      `
  const values = isEmployee(req) ? [req.accessContext.user.id] : []
  db.query(sql, [...values, number], (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}

exports.returnOutProductListData = (req, res) => {
  const number = (req.body.pager - 1) * 10
  const sql = isEmployee(req)
    ? `
        select ${OUT_PRODUCT_COLUMNS}
        from outproduct
        where product_out_apply_user_id = ?
        order by product_audit_time desc
        limit 10 offset ?
      `
    : `
        select ${OUT_PRODUCT_COLUMNS}
        from outproduct
        order by product_audit_time desc
        limit 10 offset ?
      `
  const values = isEmployee(req) ? [req.accessContext.user.id] : []
  db.query(sql, [...values, number], (err, result) => {
    if (err) return res.cc(err)
    res.send(result)
  })
}
