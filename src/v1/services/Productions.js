const insert = (data, client) => {
    const query = `INSERT INTO productions (product_id, date, constituent, last_edited_by, attributes) VALUES ($1, $2, $3, $4, $5) RETURNING *`
    const values = [data.product_id, data.date, data.userid, data.userid, data.attributes]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const getOne = (production_id, client) => {
    const query = `
        SELECT pro.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
        FROM productions pro
        LEFT JOIN "User" u ON u.userid = pro.constituent
        LEFT JOIN "User" u2 ON u2.userid = pro.last_edited_by
        LEFT JOIN product p ON p.product_id = pro.product_id
        WHERE pro.production_id = $1
        ORDER BY pro.date ASC
    `
    const values = [production_id]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const getAll = () => {
    return process.pool.query(
        `
            SELECT pro.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
            FROM productions pro
            LEFT JOIN "User" u ON u.userid = pro.constituent
            LEFT JOIN "User" u2 ON u2.userid = pro.last_edited_by
            LEFT JOIN product p ON p.product_id = pro.product_id
            ORDER BY pro.date ASC
        `
    )
}

const update = (data, client) => {
    const query = 'UPDATE productions SET production = $1, last_edited_by = $2 WHERE production_id = $3 RETURNING *'
    const values = [data.production, data.userid, data.production_id]
    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const del = (id) => {
    return process.pool.query('DELETE FROM productions WHERE production_id = $1', [id])
}

module.exports = {
    insert,
    getOne,
    getAll,
    update,
    del
}
