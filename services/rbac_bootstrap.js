/**
 * 模块说明：
 * 1. RBAC 初始化与幂等同步。
 * 2. 负责建表、补列以及把内置角色/权限定义同步进数据库。
 * 3. 启动时执行一次，保证权限系统具备最小可运行结构。
 */

const db = require('../db')
const {
  permissionDefinitions,
  roleDefinitions,
  rolePermissionCodeMap,
} = require('./rbac_definitions')

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

const ensureTable = async (sql) => {
  await query(sql)
}

const ensureColumn = async (tableName, columnName, columnSql) => {
  const rows = await query(
    `
      select count(*) as count
      from information_schema.columns
      where table_schema = database()
        and table_name = ?
        and column_name = ?
    `,
    [tableName, columnName]
  )

  if (Number(rows[0]?.count || 0) === 0) {
    await query(`alter table ${tableName} add column ${columnSql}`)
  }
}

const syncRoles = async () => {
  for (const role of roleDefinitions) {
    await query(
      `
        insert into sys_roles (code, name, description, created_at, updated_at)
        values (?, ?, ?, now(), now())
        on duplicate key update
          name = values(name),
          description = values(description),
          updated_at = now()
      `,
      [role.code, role.name, role.description]
    )
  }
}

const syncPermissions = async () => {
  for (const permission of permissionDefinitions) {
    await query(
      `
        insert into sys_permissions (code, name, type, created_at, updated_at)
        values (?, ?, ?, now(), now())
        on duplicate key update
          name = values(name),
          type = values(type),
          updated_at = now()
      `,
      [permission.code, permission.name, permission.type]
    )
  }
}

const syncRolePermissions = async () => {
  const roleRows = await query('select id, code from sys_roles')
  const permissionRows = await query('select id, code from sys_permissions')
  const roleIdByCode = new Map(roleRows.map((item) => [item.code, item.id]))
  const permissionIdByCode = new Map(permissionRows.map((item) => [item.code, item.id]))

  for (const [roleCode, permissionCodes] of Object.entries(rolePermissionCodeMap)) {
    const roleId = roleIdByCode.get(roleCode)
    if (!roleId) {
      continue
    }

    const targetPermissionIds = permissionCodes
      .map((code) => permissionIdByCode.get(code))
      .filter(Boolean)

    await query('delete from sys_role_permissions where role_id = ?', [roleId])

    for (const permissionId of targetPermissionIds) {
      await query(
        `
          insert into sys_role_permissions (role_id, permission_id, created_at)
          values (?, ?, now())
          on duplicate key update role_id = values(role_id)
        `,
        [roleId, permissionId]
      )
    }
  }
}

const bootstrapRbac = async () => {
  await ensureTable(`
    create table if not exists sys_roles (
      id int not null auto_increment primary key,
      code varchar(64) not null unique,
      name varchar(64) not null,
      description varchar(255) null,
      created_at datetime not null,
      updated_at datetime not null
    )
  `)

  await ensureTable(`
    create table if not exists sys_permissions (
      id int not null auto_increment primary key,
      code varchar(128) not null unique,
      name varchar(128) not null,
      type varchar(16) not null,
      created_at datetime not null,
      updated_at datetime not null
    )
  `)

  await ensureTable(`
    create table if not exists sys_role_permissions (
      id int not null auto_increment primary key,
      role_id int not null,
      permission_id int not null,
      created_at datetime not null,
      unique key uniq_role_permission (role_id, permission_id)
    )
  `)

  await ensureTable(`
    create table if not exists sys_user_roles (
      id int not null auto_increment primary key,
      user_id int not null,
      role_id int not null,
      created_at datetime not null,
      updated_at datetime not null,
      unique key uniq_user_role (user_id, role_id)
    )
  `)

  await ensureColumn(
    'product',
    'product_out_apply_user_id',
    'product_out_apply_user_id int null after product_out_apply_person'
  )
  await ensureColumn(
    'product',
    'product_out_apply_account',
    'product_out_apply_account varchar(64) null after product_out_apply_user_id'
  )
  await ensureColumn(
    'outproduct',
    'product_out_apply_user_id',
    'product_out_apply_user_id int null after product_out_apply_person'
  )
  await ensureColumn(
    'outproduct',
    'product_out_apply_account',
    'product_out_apply_account varchar(64) null after product_out_apply_user_id'
  )

  await syncRoles()
  await syncPermissions()
  await syncRolePermissions()
}

module.exports = {
  bootstrapRbac,
}
