const httpStatus = require('http-status/lib')
const { insert, getAll, update, del, getOne } = require('../services/Productions')
const { getName } = require('../services/Products')
const { getLast, update: updateStock, insert: addStock } = require('../services/Stocks')

const create = async (req, res) => {
    const client = await process.pool.connect()

    try {
        await client.query('BEGIN')

        const { rows } = await insert({ userid: req.user.userid, ...req.body }, client)

        let lastStock, newStock
        const { rows: lastStockRow } = await getLast(req.body.attributes, client)

        if (lastStockRow.length === 0) {
            newStock = rows[0].production
            const { rows: addedStockRow } = await addStock({ userid: req.user.userid, ...req.body, stock: newStock }, client)
            lastStock = addedStockRow[0]
        } else {
            lastStock = lastStockRow[0]
            newStock = lastStock.stock + rows[0].production
            await updateStock(
                {
                    userid: req.user.userid,
                    stock: newStock,
                    stock_id: lastStock.stock_id
                },
                client
            )
        }

        const { rows: productRows } = await getName(req.body.product_id, client)

        await client.query('COMMIT')
        client.release()

        const stock = {
            ...lastStock,
            stock: newStock,
            last_edited_by_username: req.user.username,
            new: false
        }

        if (lastStockRow.length === 0) {
            stock.product_name = productRows[0].product_name
            stock.constituent_username = req.user.username
            stock.new = true
        }

        const production = {
            ...rows[0],
            product_name: productRows[0].product_name,
            constituent_username: req.user.username,
            last_edited_by_username: req.user.username
        }

        global.socketio.emit('notification', {
            type: 'production',
            production,
            stock,
            userid: req.user.userid
        })

        res.status(httpStatus.CREATED).send({ production, stock })
    } catch (e) {
        console.log(e)
        client.release()
        if (e.constraint === 'unique_production_date')
            return res.status(httpStatus.BAD_REQUEST).send({ error: 'A registration has already been created for the selected product today.' })
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' })
    }
}

const get = (req, res) => {
    getAll()
        .then(({ rows }) => res.status(httpStatus.OK).send(rows))
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

const put = async (req, res) => {
    const client = await process.pool.connect()
    try {
        await client.query('BEGIN')

        const { rows: beginProduction, rowCount } = await getOne(req.params.id, client)
        if (!rowCount) throw 'There is no such record.'

        const { rows } = await update({ production_id: req.params.id, userid: req.user.userid, ...req.body }, client)

        const productionNumberDiff = rows[0].production - beginProduction[0].production
        const { rows: lastStock } = await getLast(rows[0].attributes, client)

        const newStock = lastStock[0].stock + productionNumberDiff
        await updateStock(
            {
                userid: req.user.userid,
                stock: newStock,
                stock_id: lastStock[0].stock_id
            },
            client
        )

        await client.query('COMMIT')
        client.release()

        const stock = {
            ...lastStock[0],
            stock: newStock,
            last_edited_by_username: req.user.username
        }

        const production = {
            ...rows[0],
            last_edited_by_username: req.user.username
        }

        global.socketio.emit('notification', {
            type: 'production_update',
            production,
            stock,
            userid: req.user.userid
        })

        res.status(httpStatus.CREATED).send({ production, stock })
    } catch (e) {
        console.log(e)
        client.release()
        if (e === 'There is no such record.') return res.status(httpStatus.BAD_REQUEST).send({ message: e })
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' })
    }
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
