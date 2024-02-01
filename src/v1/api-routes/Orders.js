const validate = require("../middlewares/validate");
const authenticate = require("../middlewares/authenticate");
const paramValidate = require("../middlewares/paramValidate");
const schemas = require("../validations/Orders");

const {
  get,
  create,
  put,
  remove,
  patch,
  patchStatus,
  createOrderNumber,
  delOrderNumber,
  putSet,
  updateSome,
} = require("../controllers/Orders");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, get);
router
  .route("/")
  .post(authenticate, validate(schemas.createValidation), create);
router
  .route("/:id")
  .put(
    authenticate,
    paramValidate("id"),
    validate(schemas.updateValidation),
    put
  );
router
  .route("/:id/set")
  .put(
    authenticate,
    paramValidate("id"),
    validate(schemas.updateValidationSet),
    putSet
  );
router
  .route("/:id")
  .patch(
    authenticate,
    paramValidate("id"),
    validate(schemas.editValidation),
    patch
  );
router.route("/patch/:id").patch(authenticate, updateSome);

router.route("/:id").delete(authenticate, paramValidate("id"), remove);
router
  .route("/:id/change-status")
  .patch(
    authenticate,
    paramValidate("id"),
    validate(schemas.updateStatusValidation),
    patchStatus
  );

router
  .route("/:order_number/order-number")
  .delete(authenticate, paramValidate("order_number"), delOrderNumber);
router.route("/order-number").get(authenticate, createOrderNumber);

module.exports = router;
