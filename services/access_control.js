const db = require('../db')
const { getRoleCodeByIdentity, menuTree, ROLE_CODES } = require('./rbac_definitions')

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

// 处理用户，把当前模块的关键逻辑集中在这里。
const sanitizeUser = (user) => (user ? { ...user, password: '' } : null)

// 获取用户，让后续逻辑统一使用这一份结果。
const getUserById = async (userId) => {
  const results = await query('select * from users where id = ? limit 1', [userId])
  return results[0] || null
}

// 获取角色编码，让后续逻辑统一使用这一份结果。
const getRoleIdsByCodes = async (roleCodes) => {
  if (!Array.isArray(roleCodes) || roleCodes.length === 0) {
    return []
  }

  const placeholders = roleCodes.map(() => '?').join(',')
  const rows = await query(
    `select id, code from sys_roles where code in (${placeholders})`,
    roleCodes
  )
  return rows
}

// 处理用户角色，把当前模块的关键逻辑集中在这里。
const replaceUserRoles = async (userId, roleCodes) => {
  const roleRows = await getRoleIdsByCodes(roleCodes)
  await query('delete from sys_user_roles where user_id = ?', [userId])

  for (const role of roleRows) {
    await query(
      `
        insert into sys_user_roles (user_id, role_id, created_at, updated_at)
        values (?, ?, now(), now())
      `,
      [userId, role.id]
    )
  }
}

// 处理用户角色，把当前模块的关键逻辑集中在这里。
const ensureUserRoleAssignment = async (user) => {
  const countRows = await query('select count(*) as count from sys_user_roles where user_id = ?', [
    user.id,
  ])
  if (Number(countRows[0]?.count || 0) > 0) {
    return
  }

  const roleCode = getRoleCodeByIdentity(user.identity)
  await replaceUserRoles(user.id, [roleCode])
}

// 加载用户角色，让后续逻辑直接复用准备好的数据。
const loadUserRoles = async (userId) => {
  const rows = await query(
    `
      select r.code, r.name
      from sys_user_roles ur
      inner join sys_roles r on r.id = ur.role_id
      where ur.user_id = ?
      order by r.id asc
    `,
    [userId]
  )

  return rows
}

// 加载权限编码，让后续逻辑直接复用准备好的数据。
const loadPermissionCodes = async (userId) => {
  const rows = await query(
    `
      select distinct p.code
      from sys_user_roles ur
      inner join sys_role_permissions rp on rp.role_id = ur.role_id
      inner join sys_permissions p on p.id = rp.permission_id
      where ur.user_id = ?
    `,
    [userId]
  )

  return rows.map((item) => item.code)
}

// 处理菜单树结构权限，把当前模块的关键逻辑集中在这里。
const filterMenuTreeByPermissions = (nodes, permissionCodeSet) => {
  return nodes.reduce((result, node) => {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0

    if (hasChildren) {
      const nextChildren = filterMenuTreeByPermissions(node.children, permissionCodeSet)
      if (nextChildren.length > 0) {
        result.push({
          ...node,
          children: nextChildren,
        })
      }
      return result
    }

    const code = node.meta?.permissionCode
    if (!code || permissionCodeSet.has(code)) {
      result.push({ ...node })
    }

    return result
  }, [])
}

// 构建访问控制上下文，把零散输入整理成后续可消费的结果。
const buildAccessContext = async (userId) => {
  const user = await getUserById(userId)
  if (!user) {
    return null
  }

  await ensureUserRoleAssignment(user)
  const roles = await loadUserRoles(userId)
  const permissionCodes = await loadPermissionCodes(userId)
  const permissionCodeSet = new Set(permissionCodes)

  return {
    user: sanitizeUser(user),
    roles: roles.map((item) => item.code),
    roleNames: roles.map((item) => item.name),
    permissionCodes,
    permissionCodeSet,
    menuTree: filterMenuTreeByPermissions(menuTree, permissionCodeSet),
  }
}

// 处理权限，把当前模块的关键逻辑集中在这里。
const hasPermission = (accessContext, permissionCode) => {
  if (!accessContext || !permissionCode) {
    return false
  }

  return accessContext.permissionCodeSet.has(permissionCode)
}

const hasAnyPermission = (accessContext, permissionCodes = []) => {
  return permissionCodes.some((code) => hasPermission(accessContext, code))
}

// 处理角色，把当前模块的关键逻辑集中在这里。
const hasRole = (accessContext, roleCode) => {
  if (!accessContext || !roleCode) {
    return false
  }

  return accessContext.roles.includes(roleCode)
}

// 导出当前模块的公共能力，方便其他业务文件按需复用。
module.exports = {
  ROLE_CODES,
  buildAccessContext,
  ensureUserRoleAssignment,
  getRoleCodeByIdentity,
  getUserById,
  hasAnyPermission,
  hasPermission,
  hasRole,
  replaceUserRoles,
}
