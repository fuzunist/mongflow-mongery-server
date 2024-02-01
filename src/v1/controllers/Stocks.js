const httpStatus = require('http-status/lib')
const { insert, getAll, update, del } = require('../services/Stocks')
const { getName } = require('../services/Products')

const create = async (req, res) => {
    insert({ userid: req.user.userid, ...req.body })
        .then(async ({ rows }) => {
            const { rows: productRows } = await getName(req.body.product_id)
            global.socketio.emit('notification', {
                type: 'stock',
                stock: {
                    ...rows[0],
                    product_name: productRows[0].product_name,
                    constituent_username: req.user.username,
                    last_edited_by_username: req.user.username
                },
                userid: req.user.userid
            })
            res.status(httpStatus.CREATED).send(rows[0])
        })
        .catch((e) => {
            if (e.constraint === 'unique_stock_date')
                return res.status(httpStatus.BAD_REQUEST).send({ error: 'A registration has already been created for the selected product today.' })

            console.log(e)
            res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' })
        })
}

const get = (req, res) => {
    getAll()
        .then(({ rows }) => res.status(httpStatus.OK).send(rows))
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

const put = (req, res) => {
    update({ stock_id: req.params.id, userid: req.user.userid, ...req.body })
        .then(({ rows, rowCount }) => {
            if (!rowCount) return res.status(httpStatus.FORBIDDEN).send({ message: 'There is no such record.' })
            res.status(httpStatus.CREATED).send(rows[0])
        })
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

const remove = (req, res) => {
    del(req.params.id)
        .then(({ rowCount }) => {
            if (!rowCount) return res.status(httpStatus.NOT_FOUND).send({ message: 'There is no such record.' })
            res.status(httpStatus.OK).send({ message: 'Stock deleted successfully.' })
        })
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

module.exports = {
    create,
    get,
    put,
    remove
}
