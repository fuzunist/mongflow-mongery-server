const authenticate = require("../middlewares/authenticate");

const { get, put, updateStocks, create, getLogs, createLog, putLog, updateStocksInProduction } = require("../controllers/RecipeMaterials");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, get);
router.route("/").post(authenticate, create);
router.route("/:id").put(authenticate, put);
router.route("/stocks/:id").put( updateStocks);
router.route("/stocks/production/:id").put( updateStocksInProduction);





router.route("/logs").get(authenticate, getLogs);
router.route("/logs").post(authenticate, createLog);
router.route("/logs/:id").patch(authenticate, putLog);
module.exports = router;
