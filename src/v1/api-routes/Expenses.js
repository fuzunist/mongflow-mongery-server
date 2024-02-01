const paramValidate = require("../middlewares/paramValidate");
const authenticate = require("../middlewares/authenticate");

const {
  getExpenses,
  getItems,
  getClasses,
  createExpense,
  createItem,
  updateExpense,
  updateExpenseItemFrequency,
} = require("../controllers/Expenses");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, getExpenses);
router.route("/class").get(authenticate, getClasses);
router.route("/items").get(authenticate, getItems);

router.route("/").post(authenticate, createExpense);
router.route("/item").post(authenticate, createItem);
router.route("/").patch(authenticate, updateExpense);
router.route("/item").patch(authenticate, updateExpenseItemFrequency);


module.exports = router;
