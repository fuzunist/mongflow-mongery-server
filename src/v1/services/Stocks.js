const insert = (data, client) => {
    const query = `INSERT INTO stocks (product_id, date, stock, constituent, last_edited_by, attributes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
    const values = [data.product_id, data.date, data.stock, data.userid, data.userid, data.attributes]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const getLast = (attributes, client) => {
    const query = `
        SELECT s.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
        FROM stocks s
        LEFT JOIN "User" u ON u.userid = s.constituent
        LEFT JOIN "User" u2 ON u2.userid = s.last_edited_by
        LEFT JOIN product p ON p.product_id = s.product_id
        WHERE s.attributes = $1
        ORDER BY s.date DESC
        LIMIT 1
    `

    if (client) return client.query(query, [attributes])
    return process.pool.query(query, [attributes])
}

const getLastSet = (attributesList, client) => {
    // Create a string of placeholders for the query ($1, $2, $3, etc.)
    const placeholders = attributesList.map((_, index) => `$${index + 1}`).join(',');

    const query = `
        SELECT s.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
        FROM stocks s
        LEFT JOIN "User" u ON u.userid = s.constituent
        LEFT JOIN "User" u2 ON u2.userid = s.last_edited_by
        LEFT JOIN product p ON p.product_id = s.product_id
        WHERE s.attributes IN (${placeholders})
        ORDER BY s.date DESC;
    `;

    return client.query(query, attributesList).then(result => {
        if (result.rows.length === 0) {
            throw new Error('No stock entries found for the provided attributes');
        }
        return result.rows;
    });
};










const getAll = () => {
    return process.pool.query(
        `
            SELECT s.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
            FROM stocks s
            LEFT JOIN "User" u ON u.userid = s.constituent
            LEFT JOIN "User" u2 ON u2.userid = s.last_edited_by
            LEFT JOIN product p ON p.product_id = s.product_id
            ORDER BY s.date ASC
        `
    )
}

const update = (data, client) => {
    const query = 'UPDATE stocks SET stock = $1, last_edited_by = $2 WHERE stock_id = $3 RETURNING *'
    const values = [data.stock, data.userid, data.stock_id]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const updateSet = async (data, client) => {
    console.log("Data received by updateSet:", data);

    // Ensure that stockDiff and stockId are present
    if (data.stockDiff === undefined || data.stock_id === undefined) {
        throw new Error("stockDiff and stock_id must be provided");
    }

    const query = `
        UPDATE stocks
        SET stock = stock - $1, last_edited_by = $2
        WHERE stock_id = $3
        RETURNING *;
    `;

    // Execute the update query with the provided stockDiff and stock_id
    const result = await client.query(query, [data.stockDiff, data.userid, data.stock_id]);

    if (result.rowCount === 0) {
        // If no rows are updated, log an error or throw an exception
        console.error(`No stock entry updated for stock_id: ${data.stock_id}`);
        throw new Error(`No stock entry updated for stock_id: ${data.stock_id}`);
    }

    console.log('Stock update result:', result.rows[0]);
    return result.rows[0]; // Return the updated stock entry
};





const del = (id) => {
    return process.pool.query('DELETE FROM stocks WHERE stock_id = $1', [id])
}

module.exports = {
    insert,
    getAll,
    update,
    updateSet,
    del,
    getLast,
    getLastSet
}
