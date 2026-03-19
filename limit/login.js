const joi = require('joi')

// 登录账号规则：6-12 位字母数字。
const accountSchema = joi.string().alphanum().min(6).max(12).required()

// 登录密码规则：6-12 位小写字母或数字，且不能是纯数字。
const passwordSchema = joi
  .string()
  .pattern(/^(?![0-9]+$)[a-z0-9]{1,50}$/)
  .min(6)
  .max(12)
  .required()

exports.login_limit = {
  // 仅校验请求体参数。
  body: {
    account: accountSchema,
    password: passwordSchema,
  },
}
