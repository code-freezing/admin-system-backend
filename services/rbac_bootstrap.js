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

// 处理表格数据，把当前模块的关键逻辑集中在这里。
const ensureTable = async (sql) => {
  await query(sql)
}

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
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

// 同步角色，避免本地状态和服务端结果出现偏差。
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

// 同步权限，避免本地状态和服务端结果出现偏差。
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

// 同步角色权限，避免本地状态和服务端结果出现偏差。
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

// 初始化当前模块，确保启动后具备完整运行条件。
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

// 导出当前模块的公共能力，方便其他业务文件按需复用。
module.exports = {
  bootstrapRbac,
}
