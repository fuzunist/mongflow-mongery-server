const insertLog = (data, client) => {
    const query = `
        INSERT INTO lastproductlogs (
            date, userid, product_id, attributes, price, 
            quantity, waybill, payment_type, payment_date, 
            customer_id, customer_city, customer_county, 
            currency_id, exchange_rate, details
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, 
            $11, $12, $13, $14, $15
        ) 
        RETURNING *`;

    const values = [
        data.date, data.userid, data.product_id, data.attributes, data.price, 
        data.quantity, data.waybill, data.payment_type, data.payment_date, 
        data.customer_id, data.customer_city, data.customer_county, 
        data.currency_id, data.exchange_rate, data.details
    ];

    if (client) return client.query(query, values);
    return process.pool.query(query, values);
};

const insertWarehouseStock = (data, client) => {
    const query = `
        INSERT INTO lastproductwarehouse (
            product_id, attributes, price, 
            quantity, customer_id, customer_city, customer_county, 
            currency_id, exchange_rate
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9
        ) 
        RETURNING *`;

    const values = [
        data.product_id, data.attributes, data.price, 
        data.quantity, data.customer_id, data.customer_city, data.customer_county, 
        data.currency_id, data.exchange_rate
    ];

    if (client) return client.query(query, values);
    return process.pool.query(query, values);
};

const updateWarehouseStock = (data, client) => {
    const query = `
    UPDATE lastproductwarehouse 
    SET 
        price = ROUND(((price * quantity + $2::numeric * $1::numeric) / (quantity + $2::numeric))::numeric, 4),
        quantity = quantity + $2
    WHERE id=$3
    RETURNING *`;

    const values = [data.price, data.quantity, data.id];

    if (client) return client.query(query, values);
    return process.pool.query(query, values);
};

const getWarehouseStock = (data, client) => {
    const query = `
        SELECT id 
        FROM lastproductwarehouse 
        WHERE product_id = $1 
        AND attributes = $2 
        AND price = $3 
        AND customer_id = $4 
        AND customer_city = $5
        AND customer_county = $6 
        AND currency_id = $7 
        AND exchange_rate = $8
    `;
    const values = [
        data.product_id, 
        data.attributes, 
        data.price, 
        data.customer_id, 
        data.customer_city, 
        data.customer_county, 
        data.currency_id, 
        data.exchange_rate
    ];

    if (client) {
        return client.query(query, values);
    } else {
        return process.pool.query(query, values);
    }
};

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
const getAllWarehouse = () => {
    return process.pool.query(`SELECT * FROM lastproductwarehouse ORDER BY id ASC`
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

const getStock= (data, client)=>{
    const query = 'SELECT id FROM lastproductstocks WHERE product_id = $1 and attributes=$2'
    const values = [data.product_id, data.attributes]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const insertStock = (data, client)=>{
    const query = 'INSERT INTO lastproductstocks (product_id, attributes, price, quantity ) VALUES( $1, $2, $3, $4) RETURNING *'
    const values = [data.product_id, data.attributes, data.price, data.quantity]

    if (client) return client.query(query, values)
    return process.pool.query(query, values)
}

const updateStock = (data, client) => {
    const query = `
    UPDATE lastproductstocks 
    SET 
        price = ROUND(((price * quantity + $4::numeric * $3::numeric) / (quantity + $4::numeric))::numeric, 4),
        quantity = quantity + $4 
    WHERE 
        product_id = $1 AND 
        attributes = $2 
    RETURNING *`;

    const values = [data.product_id, data.attributes, data.price, data.quantity];

    if (client) return client.query(query, values);
    return process.pool.query(query, values);
};



module.exports = {
    insertLog,
    insertWarehouseStock,
    updateWarehouseStock,
    getWarehouseStock,
    getStock,
    insertStock,
    updateStock,
    getAll,
    update,
    updateSet,
    del,
    getLast,
    getLastSet,
    getAllWarehouse
}
