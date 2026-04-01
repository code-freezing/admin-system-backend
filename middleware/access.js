const {
  buildAccessContext,
  hasAnyPermission,
  hasPermission,
} = require('../services/access_control')

// 处理当前模块的核心逻辑，避免同类分支散落在多个位置。
const deny = (res) => res.status(403).send({ status: 403, message: '无权限访问' })

// 加载访问控制上下文，让后续逻辑直接复用准备好的数据。
const loadAccessContext = async (req, res, next) => {
  if (!req.auth?.id) {
    return next()
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

// 处理权限，把当前模块的关键逻辑集中在这里。
const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    if (!hasPermission(req.accessContext, permissionCode)) {
      return deny(res)
    }

    next()
  }
}

// 处理权限，把当前模块的关键逻辑集中在这里。
const requireAnyPermission = (permissionCodes) => {
  return (req, res, next) => {
    if (!hasAnyPermission(req.accessContext, permissionCodes)) {
      return deny(res)
    }

    next()
  }
}

// 导出当前模块的公共能力，方便其他业务文件按需复用。
module.exports = {
  loadAccessContext,
  requirePermission,
  requireAnyPermission,
}
