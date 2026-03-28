/**
 * 模块说明：
 * 1. RBAC 内置角色、权限点和菜单树定义。
 * 2. 这里是权限系统的“单一事实来源”，启动时会同步到数据库。
 * 3. 前后端共享的权限码约定都从这里派生。
 */

const ROLE_CODES = {
  SUPER_ADMIN: 'super_admin',
  USER_ADMIN: 'user_admin',
  PRODUCT_ADMIN: 'product_admin',
  MESSAGE_ADMIN: 'message_admin',
  EMPLOYEE: 'employee',
}

const roleDefinitions = [
  { code: ROLE_CODES.SUPER_ADMIN, name: '超级管理员', description: '拥有系统全部权限' },
  { code: ROLE_CODES.USER_ADMIN, name: '用户管理员', description: '负责普通用户管理与授权' },
  { code: ROLE_CODES.PRODUCT_ADMIN, name: '产品管理员', description: '负责库存与出库审核' },
  { code: ROLE_CODES.MESSAGE_ADMIN, name: '消息管理员', description: '负责公告与回收站管理' },
  { code: ROLE_CODES.EMPLOYEE, name: '普通用户', description: '只保留自助申请和基础访问能力' },
]

const menuTree = [
  {
    name: 'home',
    path: '/home',
    component: 'home/index',
    meta: {
      title: '首页',
      icon: 'House',
      permissionCode: 'menu.home',
    },
  },
  {
    name: 'overview',
    path: '/overview',
    component: 'overview/index',
    meta: {
      title: '系统概览',
      icon: 'DataAnalysis',
      permissionCode: 'menu.overview',
    },
  },
  {
    name: 'user_manage_root',
    path: '/user_manage',
    meta: {
      title: '用户管理',
      icon: 'User',
    },
    children: [
      {
        name: 'product_manage',
        path: '/product_manage',
        component: 'user_manage/product_manage/index',
        meta: {
          title: '产品管理员',
          permissionCode: 'menu.user.product_manage',
        },
      },
      {
        name: 'users_manage',
        path: '/users_manage',
        component: 'user_manage/users_manage/index',
        meta: {
          title: '用户管理员',
          permissionCode: 'menu.user.users_manage',
        },
      },
      {
        name: 'message_manage',
        path: '/message_manage',
        component: 'user_manage/message_manage/index',
        meta: {
          title: '消息管理员',
          permissionCode: 'menu.user.message_manage',
        },
      },
      {
        name: 'user_list',
        path: '/user_list',
        component: 'user_manage/user_list/index',
        meta: {
          title: '用户列表',
          permissionCode: 'menu.user.user_list',
        },
      },
    ],
  },
  {
    name: 'product_root',
    path: '/product',
    meta: {
      title: '产品管理',
      icon: 'TakeawayBox',
    },
    children: [
      {
        name: 'product_manage_list',
        path: '/product_manage_list',
        component: 'product/product_manage_list/index',
        meta: {
          title: '产品列表',
          permissionCode: 'menu.product.product_manage_list',
        },
      },
      {
        name: 'out_product_manage_list',
        path: '/out_product_manage_list',
        component: 'product/out_product_manage_list/index',
        meta: {
          title: '出库列表',
          permissionCode: 'menu.product.out_product_manage_list',
        },
      },
    ],
  },
  {
    name: 'message_root',
    path: '/message',
    meta: {
      title: '消息管理',
      icon: 'ChatSquare',
    },
    children: [
      {
        name: 'message_list',
        path: '/message_list',
        component: 'message/message_list/index',
        meta: {
          title: '消息列表',
          permissionCode: 'menu.message.message_list',
        },
      },
      {
        name: 'recycle',
        path: '/recycle',
        component: 'message/recycle/index',
        meta: {
          title: '回收站',
          permissionCode: 'menu.message.recycle',
        },
      },
    ],
  },
  {
    name: 'file',
    path: '/file',
    component: 'file/index',
    meta: {
      title: '文件管理',
      icon: 'Files',
      permissionCode: 'menu.file',
    },
  },
  {
    name: 'operation_log',
    path: '/operation_log',
    component: 'operation_log/index',
    meta: {
      title: '操作日志',
      icon: 'Memo',
      permissionCode: 'menu.operation_log',
    },
  },
  {
    name: 'login_log',
    path: '/login_log',
    component: 'login_log/index',
    meta: {
      title: '登录日志',
      icon: 'Document',
      permissionCode: 'menu.login_log',
    },
  },
  {
    name: 'set',
    path: '/set',
    component: 'set/index',
    meta: {
      title: '系统设置',
      icon: 'Tools',
      permissionCode: 'menu.set',
    },
  },
]

const buttonPermissions = [
  { code: 'button.user.admin.create', name: '新增管理员', type: 'button' },
  { code: 'button.user.admin.edit', name: '编辑管理员', type: 'button' },
  { code: 'button.user.admin.delete', name: '管理员降级', type: 'button' },
  { code: 'button.user.user.edit', name: '编辑普通用户', type: 'button' },
  { code: 'button.user.user.promote', name: '提升用户权限', type: 'button' },
  { code: 'button.user.user.delete', name: '删除普通用户', type: 'button' },
  { code: 'button.user.user.ban', name: '冻结用户', type: 'button' },
  { code: 'button.user.user.unban', name: '解冻用户', type: 'button' },
  { code: 'button.product.create', name: '产品入库', type: 'button' },
  { code: 'button.product.edit', name: '编辑库存', type: 'button' },
  { code: 'button.product.delete', name: '删除库存', type: 'button' },
  { code: 'button.product.apply', name: '发起出库申请', type: 'button' },
  { code: 'button.product.withdraw', name: '撤回申请', type: 'button' },
  { code: 'button.product.reapply', name: '重新申请', type: 'button' },
  { code: 'button.product.audit', name: '审核出库', type: 'button' },
  { code: 'button.message.publish', name: '发布消息', type: 'button' },
  { code: 'button.message.edit', name: '编辑消息', type: 'button' },
  { code: 'button.message.delete', name: '删除消息', type: 'button' },
  { code: 'button.message.recover', name: '恢复消息', type: 'button' },
  { code: 'button.message.permanent_delete', name: '永久删除消息', type: 'button' },
  { code: 'button.file.upload', name: '上传文件', type: 'button' },
  { code: 'button.file.delete', name: '删除文件', type: 'button' },
  { code: 'button.setting.company.write', name: '编辑公司设置', type: 'button' },
  { code: 'button.setting.swiper.upload', name: '上传轮播图', type: 'button' },
  { code: 'button.setting.dictionary.write', name: '维护字典', type: 'button' },
  { code: 'button.log.login.clear', name: '清空登录日志', type: 'button' },
  { code: 'button.log.operation.clear', name: '清空操作日志', type: 'button' },
]

const apiPermissions = [
  { code: 'api.overview.read', name: '读取系统概览', type: 'api' },
  { code: 'api.user.admin.read', name: '读取管理员数据', type: 'api' },
  { code: 'api.user.admin.create', name: '创建管理员', type: 'api' },
  { code: 'api.user.admin.edit', name: '编辑管理员', type: 'api' },
  { code: 'api.user.admin.demote', name: '管理员降级', type: 'api' },
  { code: 'api.user.user.read', name: '读取普通用户数据', type: 'api' },
  { code: 'api.user.user.edit', name: '编辑普通用户', type: 'api' },
  { code: 'api.user.user.promote', name: '提升普通用户权限', type: 'api' },
  { code: 'api.user.user.ban', name: '冻结普通用户', type: 'api' },
  { code: 'api.user.user.unban', name: '解冻普通用户', type: 'api' },
  { code: 'api.user.user.delete', name: '删除普通用户', type: 'api' },
  { code: 'api.product.inventory.read', name: '读取库存列表', type: 'api' },
  { code: 'api.product.outbound.read', name: '读取出库申请列表', type: 'api' },
  { code: 'api.product.history.read', name: '读取出库历史', type: 'api' },
  { code: 'api.product.create', name: '产品入库', type: 'api' },
  { code: 'api.product.edit', name: '编辑库存', type: 'api' },
  { code: 'api.product.delete', name: '删除库存', type: 'api' },
  { code: 'api.product.apply', name: '发起出库申请', type: 'api' },
  { code: 'api.product.withdraw', name: '撤回出库申请', type: 'api' },
  { code: 'api.product.reapply', name: '重新申请出库', type: 'api' },
  { code: 'api.product.audit', name: '审核出库申请', type: 'api' },
  { code: 'api.message.list.read', name: '读取消息列表', type: 'api' },
  { code: 'api.message.recycle.read', name: '读取消息回收站', type: 'api' },
  { code: 'api.message.publish', name: '发布消息', type: 'api' },
  { code: 'api.message.edit', name: '编辑消息', type: 'api' },
  { code: 'api.message.delete', name: '删除消息', type: 'api' },
  { code: 'api.message.recover', name: '恢复消息', type: 'api' },
  { code: 'api.message.permanent_delete', name: '永久删除消息', type: 'api' },
  { code: 'api.file.read', name: '读取文件列表', type: 'api' },
  { code: 'api.file.upload', name: '上传文件', type: 'api' },
  { code: 'api.file.delete', name: '删除文件', type: 'api' },
  { code: 'api.setting.write.company', name: '修改公司设置', type: 'api' },
  { code: 'api.setting.write.swiper', name: '上传轮播图', type: 'api' },
  { code: 'api.setting.write.dictionary', name: '维护系统字典', type: 'api' },
  { code: 'api.log.login.read', name: '读取登录日志', type: 'api' },
  { code: 'api.log.login.clear', name: '清空登录日志', type: 'api' },
  { code: 'api.log.operation.read', name: '读取操作日志', type: 'api' },
  { code: 'api.log.operation.clear', name: '清空操作日志', type: 'api' },
]

const collectLeafMenus = (nodes) => {
  return nodes.flatMap((node) => {
    if (Array.isArray(node.children) && node.children.length > 0) {
      return collectLeafMenus(node.children)
    }

    return node.meta?.permissionCode
      ? [
          {
            code: node.meta.permissionCode,
            name: node.meta.title,
            type: 'menu',
          },
        ]
      : []
  })
}

const permissionDefinitions = [
  ...collectLeafMenus(menuTree),
  ...buttonPermissions,
  ...apiPermissions,
]

const allPermissionCodes = permissionDefinitions.map((item) => item.code)

const rolePermissionCodeMap = {
  [ROLE_CODES.SUPER_ADMIN]: allPermissionCodes,
  [ROLE_CODES.USER_ADMIN]: [
    'menu.home',
    'menu.set',
    'menu.user.user_list',
    'button.user.user.edit',
    'button.user.user.promote',
    'button.user.user.delete',
    'button.user.user.ban',
    'button.user.user.unban',
    'api.user.user.read',
    'api.user.user.edit',
    'api.user.user.promote',
    'api.user.user.ban',
    'api.user.user.unban',
    'api.user.user.delete',
  ],
  [ROLE_CODES.PRODUCT_ADMIN]: [
    'menu.home',
    'menu.set',
    'menu.product.product_manage_list',
    'menu.product.out_product_manage_list',
    'button.product.create',
    'button.product.edit',
    'button.product.delete',
    'button.product.apply',
    'button.product.withdraw',
    'button.product.reapply',
    'button.product.audit',
    'api.product.inventory.read',
    'api.product.outbound.read',
    'api.product.history.read',
    'api.product.create',
    'api.product.edit',
    'api.product.delete',
    'api.product.apply',
    'api.product.withdraw',
    'api.product.reapply',
    'api.product.audit',
  ],
  [ROLE_CODES.MESSAGE_ADMIN]: [
    'menu.home',
    'menu.set',
    'menu.message.message_list',
    'menu.message.recycle',
    'button.message.publish',
    'button.message.edit',
    'button.message.delete',
    'button.message.recover',
    'button.message.permanent_delete',
    'api.message.list.read',
    'api.message.recycle.read',
    'api.message.publish',
    'api.message.edit',
    'api.message.delete',
    'api.message.recover',
    'api.message.permanent_delete',
  ],
  [ROLE_CODES.EMPLOYEE]: [
    'menu.home',
    'menu.set',
    'menu.product.product_manage_list',
    'menu.product.out_product_manage_list',
    'button.product.apply',
    'button.product.withdraw',
    'button.product.reapply',
    'api.product.inventory.read',
    'api.product.outbound.read',
    'api.product.history.read',
    'api.product.apply',
    'api.product.withdraw',
    'api.product.reapply',
  ],
}

const identityRoleCodeMap = {
  超级管理员: ROLE_CODES.SUPER_ADMIN,
  用户管理员: ROLE_CODES.USER_ADMIN,
  产品管理员: ROLE_CODES.PRODUCT_ADMIN,
  消息管理员: ROLE_CODES.MESSAGE_ADMIN,
  用户: ROLE_CODES.EMPLOYEE,
}

const getRoleCodeByIdentity = (identity) => {
  return identityRoleCodeMap[identity] || ROLE_CODES.EMPLOYEE
}

module.exports = {
  ROLE_CODES,
  roleDefinitions,
  permissionDefinitions,
  rolePermissionCodeMap,
  menuTree,
  getRoleCodeByIdentity,
}
