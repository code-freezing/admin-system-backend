/**
 * 模块说明：
 * 1. 性能相关数据库初始化。
 * 2. 负责按真实查询模式补齐热点索引，避免分页、筛选和统计长期走全表扫描。
 * 3. 启动时幂等执行，不要求人工单独维护数据库结构。
 */

const db = require('../db')

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

const ensureIndex = async (tableName, indexName, columnSql) => {
  const rows = await query(
    `
      select count(*) as count
      from information_schema.statistics
      where table_schema = database()
        and table_name = ?
        and index_name = ?
    `,
    [tableName, indexName]
  )

  if (Number(rows[0]?.count || 0) > 0) {
    return
  }

  await query(`alter table ${tableName} add index ${indexName} ${columnSql}`)
}

const bootstrapPerformance = async () => {
  await ensureIndex('users', 'idx_users_identity', '(identity)')
  await ensureIndex('users', 'idx_users_department', '(department)')
  await ensureIndex('users', 'idx_users_status', '(status)')
  await ensureIndex('users', 'idx_users_account', '(account)')

  await ensureIndex(
    'message',
    'idx_message_status_category_publish_time',
    '(message_status, message_category, message_publish_time)'
  )
  await ensureIndex('message', 'idx_message_publish_department', '(message_publish_department)')
  await ensureIndex('message', 'idx_message_level', '(message_level)')

  await ensureIndex('product', 'idx_product_create_time', '(product_create_time)')
  await ensureIndex('product', 'idx_product_out_status', '(product_out_status)')
  await ensureIndex('product', 'idx_product_product_id', '(product_id)')
  await ensureIndex('product', 'idx_product_out_id', '(product_out_id)')

  await ensureIndex('outproduct', 'idx_outproduct_audit_time', '(product_audit_time)')
  await ensureIndex('outproduct', 'idx_outproduct_out_id', '(product_out_id)')

  await ensureIndex('files', 'idx_files_status_upload_time', '(status, upload_time)')
  await ensureIndex('files', 'idx_files_name', '(file_name)')

  await ensureIndex('login_log', 'idx_login_log_time', '(login_time)')
  await ensureIndex('login_log', 'idx_login_log_account', '(account)')

  await ensureIndex('operation_log', 'idx_operation_log_time', '(operation_time)')
  await ensureIndex('operation_log', 'idx_operation_log_person', '(operation_person)')
}

module.exports = {
  bootstrapPerformance,
}
