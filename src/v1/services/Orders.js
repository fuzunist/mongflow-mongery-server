const insert = (client, data) => {
  return client.query(
    `INSERT INTO orders (
        userid, customer_id, currency_id, order_status, order_date, 
        order_number, subtotal, tax_rate, total_with_tax, products, 
        sets, status, approver_id, exchange_rate, total_cost, 
        valid_date, delivery_terms, delivery_point, payment_type, 
        maturity, notes, vat_declaration, vat_witholding_rate, 
        vat_witholding
    ) 
    VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, 
        $21, $22, $23, $24
    ) 
    RETURNING *`,
    [
      data.userid,
      data.customer_id,
      data.currency_id,
      data.order_status,
      data.order_date,
      data.order_number,
      data.subtotal,
      data.tax_rate,
      data.total_with_tax,
      data.products,
      data.sets,
      data.status,
      data.approver_id,
      data.exchange_rate,
      data.total_cost,
      data.valid_date,
      data.delivery_terms,
      data.delivery_point,
      data.payment_type,
      data.maturity,
      data.notes,
      data.vat_declaration,
      data.vat_witholding_rate,
      data.vat_witholding,
    ]
  );
};

const getAll = () => {
  return process.pool.query(
    `
            WITH Customer AS (
                SELECT 
                    customerid, 
                    jsonb_agg(jsonb_build_object(
                        'companyname', companyname, 
                        'email', email, 
                        'phone', phone
                    )) AS Customer 
                FROM customer 
                GROUP BY customerid
            ) 
            SELECT o.*, u.username, c.currency_code, cu.Customer[0], u2.username AS approver 
            FROM "orders" o
            LEFT JOIN "User" u ON o.userid = u.userid 
            LEFT JOIN "User" u2 ON o.approver_id = u2.userid 
            LEFT JOIN "currency" c ON o.currency_id = c.currency_id 
            LEFT JOIN Customer cu ON o.customer_id = cu.customerid 
            ORDER BY o.order_id ASC
        `
  );
};

const getOne = (id, client) => {
  const query = `
        WITH Customer AS (
            SELECT 
                customerid, 
                jsonb_agg(jsonb_build_object(
                    'companyname', companyname, 
                    'email', email, 
                    'phone', phone
                )) AS Customer 
            FROM customer 
            GROUP BY customerid
        ) 
        SELECT o.*, u.username, c.currency_code, cu.Customer[0], u2.username AS approver 
        FROM "orders" o 
        LEFT JOIN "User" u ON o.userid = u.userid 
        LEFT JOIN "User" u2 ON o.approver_id = u2.userid 
        LEFT JOIN "currency" c ON o.currency_id = c.currency_id 
        LEFT JOIN Customer cu ON o.customer_id = cu.customerid 
        WHERE o.order_id = $1
    `;
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateOrderStatus = (data, client) => {
  const query =
    "UPDATE orders SET products = $1, order_status = $2 WHERE order_id = $3 RETURNING order_id";
  const values = [data.products, data.order_status, data.order_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateOrderStatusSet = (data, client) => {
  console.log("updateOrderStatusSet called with data:", data);

  if (!data || !data.sets || !data.order_status) {
    console.log("Invalid data:", data);
    throw new Error("Invalid data");
  }

  const query =
    "UPDATE orders SET sets = $1, order_status = $2 WHERE order_id = $3 RETURNING order_id";
  const values = [data.sets, data.order_status, data.order_id];

  console.log("Executing query:", query, "with values:", values);

  if (client) {
    const result = client.query(query, values);
    console.log("Query result:", result);
    return result;
  }

  const result = process.pool.query(query, values);
  console.log("Query result:", result);
  return result;
};

const update = (client, data) => {
  return client.query(
    "UPDATE orders SET customer_id = $1, currency_id = $2, subtotal = $3, total_with_tax = $4, products = $5, sets = $6, order_status = $7  WHERE order_id = $8 RETURNING *",
    [
      data.customerid,
      data.currency_id,
      data.subtotal,
      data.total_with_tax,
      data.products,
      data.sets,
      data.order_status,
      data.order_id,
    ]
  );
};

const updateStatus = (data) => {
  return process.pool.query(
    "UPDATE orders SET status = $1, approver_id = $2 WHERE order_id = $3 RETURNING *",
    [data.status, data.userid, data.order_id]
  );
};

const del = (id, client) => {
  const query = "DELETE FROM orders WHERE order_id = $1";
  const values = [id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _insertOrderCounter = (data, client) => {
  const query =
    "INSERT INTO ordercounter (suffix, counter, date) VALUES ($1, $2, $3) RETURNING *";
  const values = [data.suffix, data.counter, data.date];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _getOrderCounter = (data, client) => {
  const query = "SELECT * FROM ordercounter WHERE suffix = $1";
  const values = [data.suffix];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const _updateOrderCounter = (data, client) => {
  const query =
    "UPDATE ordercounter SET counter = $1, date = $2 WHERE suffix = $3 RETURNING *";
  const values = [data.counter, data.date, data.suffix];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const patchSome = (order_id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE orders SET ${setValues} WHERE order_id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), order_id];

  return process.pool.query(query, values);
};

module.exports = {
  insert,
  getOne,
  getAll,
  updateOrderStatus,
  updateOrderStatusSet,
  update,
  updateStatus,
  del,
  _insertOrderCounter,
  _getOrderCounter,
  _updateOrderCounter,
  patchSome,
};
