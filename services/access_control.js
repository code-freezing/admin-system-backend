/**
 * 模块说明：
 * 1. 授权上下文服务。
 * 2. 负责用户角色回填、权限码装载、菜单树裁剪和角色同步。
 * 3. 所有接口鉴权和前端权限初始化都依赖这里。
 */

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

const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  return {
    ...user,
    password: '',
  }
}

const getUserById = async (userId) => {
  const results = await query('select * from users where id = ? limit 1', [userId])
  return results[0] || null
}

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

const hasPermission = (accessContext, permissionCode) => {
  if (!accessContext || !permissionCode) {
    return false
  }

  return accessContext.permissionCodeSet.has(permissionCode)
}

const hasAnyPermission = (accessContext, permissionCodes = []) => {
  return permissionCodes.some((code) => hasPermission(accessContext, code))
}

const hasRole = (accessContext, roleCode) => {
  if (!accessContext || !roleCode) {
    return false
  }

  return Array.isArray(accessContext.roles) && accessContext.roles.includes(roleCode)
}

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
