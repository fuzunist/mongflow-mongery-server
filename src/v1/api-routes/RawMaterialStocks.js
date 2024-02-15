const authenticate = require("../middlewares/authenticate");

const { get, put, getLogs, createLog, putLog  } = require("../controllers/RawMaterialStocks");

const express = require("express");
const router = express.Router();

router.route("/").get(authenticate, get);
router.route("/").post(authenticate, createLog);
router.route("/:id").put(authenticate, put);

router.route("/logs").get(authenticate, getLogs);
router.route("/logs/:id").patch(authenticate, putLog);

module.exports = router;
