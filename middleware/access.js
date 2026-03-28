/**
 * 模块说明：
 * 1. RBAC 授权中间件。
 * 2. 负责装载当前用户权限上下文，并在路由层统一执行权限判断。
 * 3. 业务 handler 只需要处理资源级补充校验。
 */

const { buildAccessContext, hasAnyPermission, hasPermission } = require('../services/access_control')

const deny = (res) => {
  return res.status(403).send({
    status: 403,
    message: '无权限访问',
  })
}

const loadAccessContext = async (req, res, next) => {
  if (!req.auth?.id) {
    next()
    return
  }

  try {
    const accessContext = await buildAccessContext(req.auth.id)
    if (!accessContext) {
      return deny(res)
    }

    req.accessContext = accessContext
    next()
  } catch (error) {
    next(error)
  }
}

const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    if (!hasPermission(req.accessContext, permissionCode)) {
      return deny(res)
    }

    next()
  }
}

const requireAnyPermission = (permissionCodes) => {
  return (req, res, next) => {
    if (!hasAnyPermission(req.accessContext, permissionCodes)) {
      return deny(res)
    }

    next()
  }
}

module.exports = {
  loadAccessContext,
  requirePermission,
  requireAnyPermission,
}
