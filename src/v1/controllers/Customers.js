const httpStatus = require('http-status/lib')
const { insert, getAll, update, del } = require('../services/Customers')

const create = async (req, res) => {

    insert({ userid: req.user.userid, ...req.body })
        .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
        .catch((e) => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e.message }))
}

const get = (req, res) => {
    getAll()
        .then(({ rows }) => res.status(httpStatus.OK).send(rows))
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

const put = (req, res) => {
    update({ customerid: req.params.id, ...req.body })
        .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
        .catch((e) => {
             console.log(e)
           return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e.message })})
}

const remove = (req, res) => {
    del(req.params.id)
        .then(({ rowCount }) => {
            if (!rowCount) return res.status(httpStatus.NOT_FOUND).send({ message: 'There is no such record.' })
            res.status(httpStatus.OK).send({ message: 'Customer deleted successfully.' })
        })
        .catch(() => res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: 'An error occurred.' }))
}

module.exports = {
    create,
    get,
    put,
    remove
}
