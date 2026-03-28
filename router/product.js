/**
 * 模块说明：
 * 1. 产品模块路由声明。
 * 2. 统一注册入库、出库申请、审核、分页和查询相关接口。
 * 3. 产品业务流程较长，因此路由与 handler 分离能更易读。
 */

const express = require('express')
const router = express.Router()
const productHandler = require('../router_handle/product')
const { requireAnyPermission, requirePermission } = require('../middleware/access')

// 产品库存、出库申请、审核和历史出库记录接口。
// 和前端 product_manage_list 页的两个标签页基本是一一对应的：
// 1. 入库管理：create/edit/delete/getProduct*/searchProductForId
// 2. 出库管理：apply/withdraw/audit/getApply*/searchProductForApplyId
// 3. 历史出库：auditProductList/getOutProductLength/searchProductForOutId
router.post('/createProduct', requirePermission('api.product.create'), productHandler.createProduct)
router.post('/deleteProduct', requirePermission('api.product.delete'), productHandler.deleteProduct)
router.post('/editProduct', requirePermission('api.product.edit'), productHandler.editProduct)
router.post(
  '/getProductList',
  requirePermission('api.product.inventory.read'),
  productHandler.getProductList
)
router.post(
  '/applyOutProduct',
  requireAnyPermission(['api.product.apply', 'api.product.reapply']),
  productHandler.applyOutProduct
)
router.post(
  '/applyProductList',
  requirePermission('api.product.outbound.read'),
  productHandler.applyProductList
)
router.post(
  '/withdrawApplyProduct',
  requirePermission('api.product.withdraw'),
  productHandler.withdrawApplyProduct
)
router.post('/auditProduct', requirePermission('api.product.audit'), productHandler.auditProduct)
router.post(
  '/searchProductForId',
  requirePermission('api.product.inventory.read'),
  productHandler.searchProductForId
)
router.post(
  '/searchProductForApplyId',
  requirePermission('api.product.outbound.read'),
  productHandler.searchProductForApplyId
)
router.post(
  '/searchProductForOutId',
  requirePermission('api.product.history.read'),
  productHandler.searchProductForOutId
)
router.post(
  '/getProductLength',
  requirePermission('api.product.inventory.read'),
  productHandler.getProductLength
)
router.post(
  '/getApplyProductLength',
  requirePermission('api.product.outbound.read'),
  productHandler.getApplyProductLength
)
router.post(
  '/auditProductList',
  requirePermission('api.product.history.read'),
  productHandler.auditProductList
)
router.post(
  '/getOutProductLength',
  requirePermission('api.product.history.read'),
  productHandler.getOutProductLength
)
router.post(
  '/returnProductListData',
  requirePermission('api.product.inventory.read'),
  productHandler.returnProductListData
)
router.post(
  '/returnApplyProductListData',
  requirePermission('api.product.outbound.read'),
  productHandler.returnApplyProductListData
)
router.post(
  '/returnOutProductListData',
  requirePermission('api.product.history.read'),
  productHandler.returnOutProductListData
)

module.exports = router
