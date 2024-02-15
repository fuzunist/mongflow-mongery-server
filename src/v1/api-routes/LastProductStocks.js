const validate = require('../middlewares/validate')
const authenticate = require('../middlewares/authenticate')
const paramValidate = require('../middlewares/paramValidate')

const { get, create, put, remove,getAllWarehouseStock } = require('../controllers/LastProductStocks')

const express = require('express')

const router = express.Router()

router.route('/').get(authenticate, get)
router.route('/warehouse').get(authenticate, getAllWarehouseStock)
router.route('/').post(authenticate, create)
router.route('/:id').put(authenticate, paramValidate('id'), put)
router.route('/:id').delete(authenticate, paramValidate('id'), remove)

module.exports = router
