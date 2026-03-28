/**
 * 模块说明：
 * 1. 用户模块 Joi 校验规则。
 * 2. 覆盖修改密码、修改姓名、修改邮箱和找回密码等接口。
 * 3. 把校验从业务处理里拆出来，便于复用和维护。
 */

const joi = require('joi')

// 通用 ID 规则：必须提供。
const idSchema = joi.required()

// 姓名规则：2-10 位中文姓名，支持少数民族中点写法。
const nameSchema = joi
  .string()
  .pattern(/^[\u4E00-\u9FA5]{2,10}(·[\u4E00-\u9FA5]{2,10}){0,2}$/)
  .required()

// 邮箱规则：常见邮箱格式校验。
const emailSchema = joi
  .string()
  .pattern(/^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/)
  .required()

// 密码规则：6-12 位小写字母或数字，且不能是纯数字。
const oldPasswordSchema = joi
  .string()
  .pattern(/^(?![0-9]+$)[a-z0-9]{1,50}$/)
  .min(6)
  .max(12)
  .required()

const newPasswordSchema = joi
  .string()
  .pattern(/^(?![0-9]+$)[a-z0-9]{1,50}$/)
  .min(6)
  .max(12)
  .required()

exports.password_limit = {
  // 用户已登录后修改密码。
  body: {
    id: idSchema,
    oldPassword: oldPasswordSchema,
    newPassword: newPasswordSchema,
  },
}

exports.name_limit = {
  // 修改姓名。
  body: {
    id: idSchema,
    name: nameSchema,
  },
}

exports.email_limit = {
  // 修改邮箱。
  body: {
    id: idSchema,
    email: emailSchema,
  },
}

exports.forgetPassword_limit = {
  // 登录页找回密码后重置密码。
  body: {
    id: idSchema,
    newPassword: newPasswordSchema,
  },
}
