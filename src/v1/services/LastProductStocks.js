const insertLog = (data, client) => {
  const query = `
        INSERT INTO lastproductlogs (
            date, userid, product_id, attributes, price, 
            quantity, waybill, payment_type, payment_date, 
            customer_id, customer_city, customer_county, 
            currency_id, exchange_rate, vat_rate,
            vat_witholding_rate, vat_declaration,
            vat_witholding, price_with_vat, details
        ) 
        VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, 
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20
        ) 
        RETURNING *`;

  const values = [
    data.date,
    data.userid,
    data.product_id,
    data.attributes,
    data.price,
    data.quantity,
    data.waybill,
    data.payment_type,
    data.payment_date,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.currency_id,
    data.exchange_rate,
    data.vat_rate,
    data.vat_witholding_rate,
    data.vat_declaration,
    data.vat_witholding,
    data.price_with_vat,
    data.details,
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
    data.product_id,
    data.attributes,
    data.price,
    data.quantity,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.currency_id,
    data.exchange_rate,
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
    SELECT 
      w.id,
      w.product_id,
      w.price,
      w.quantity,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
      lastproductwarehouse w
    LEFT JOIN LATERAL (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text(w.attributes::jsonb)
    ) AS attr_val ON true
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
    WHERE 
      w.product_id = $1 
      AND w.attributes = $2 
      AND w.price = $3 
      AND w.customer_id = $4 
      AND w.customer_city = $5
      AND w.customer_county = $6 
      AND w.currency_id = $7 
      AND w.exchange_rate = $8
    GROUP BY 
      w.id, w.product_id, w.price, w.quantity
  `;
  const values = [
    data.product_id,
    data.attributes,
    data.price,
    data.customer_id,
    data.customer_city,
    data.customer_county,
    data.currency_id,
    data.exchange_rate,
  ];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

// const getProductStocks = ()=>{
//   return process.pool.query(
//     `SELECT * FROM lastproductstocks ORDER BY id ASC`
//   );
// }

const getProductStocks = () => {
  return process.pool.query(
    `SELECT 
    s.id, s.product_id, s.price, s.quantity, p.product_name,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
      lastproductstocks s
    LEFT JOIN LATERAL (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text(s.attributes::jsonb)
    ) AS attr_val ON true
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
    LEFT JOIN product AS p ON p.product_id = s.product_id
    GROUP BY 
      s.id, s.product_id, s.price, s.quantity, p.product_name
    ORDER BY 
      s.id ASC`
  );
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
    `;

  if (client) return client.query(query, [attributes]);
  return process.pool.query(query, [attributes]);
};

const getLastSet = (attributesList, client) => {
  // Create a string of placeholders for the query ($1, $2, $3, etc.)
  const placeholders = attributesList
    .map((_, index) => `$${index + 1}`)
    .join(",");
  const query = `
        SELECT s.*, p.product_name, u.username as constituent_username, u2.username as last_edited_by_username
        FROM stocks s
        LEFT JOIN "User" u ON u.userid = s.constituent
        LEFT JOIN "User" u2 ON u2.userid = s.last_edited_by
        LEFT JOIN product p ON p.product_id = s.product_id
        WHERE s.attributes IN (${placeholders})
        ORDER BY s.date DESC;
    `;

  return client.query(query, attributesList).then((result) => {
    if (result.rows.length === 0) {
      throw new Error("No stock entries found for the provided attributes");
    }
    return result.rows;
  });
};

// const getRangeLogs = (data) => {
//     console.log("data", data)
//     return process.pool.query(
//       'SELECT * FROM "lastproductlogs" WHERE date BETWEEN $1 AND $2 ORDER BY date ASC',
//       [data.startDate, data.endDate]
//     );
// }

const getAllAttributeDetails = (id, client) => {
  const query = `SELECT lastproductlogs.product_id, 
                jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
         FROM lastproductlogs
         LEFT JOIN LATERAL (
             SELECT key::int AS attr_id, value::int AS val_id
             FROM jsonb_each_text(lastproductlogs.attributes::jsonb)
         ) AS attr_val ON true
         LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
         LEFT JOIN value AS val ON val.value_id = attr_val.val_id
         WHERE lastproductlogs.id= $1
         GROUP BY lastproductlogs.product_id`;

  const values = [id];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getAttributeDetails = (attributesJson, client) => {
  const query = `
    SELECT 
      attr.attribute_name,
      val.value
    FROM (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text($1::jsonb)
    ) AS attr_val
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
  `;

  const values = [attributesJson];

  return new Promise((resolve, reject) => {
    (client || process.pool).query(query, values, (err, result) => {
      if (err) {
        reject(err);
      } else {
        const attributeDetails = {};
        result.rows.forEach((row) => {
          attributeDetails[row.attribute_name] = row.value;
        });
        resolve(attributeDetails);
      }
    });
  });
};

const getRangeLogs = async (data) => {
  return await process.pool.query(
    `SELECT lastproductlogs.*, customer.companyname, product.product_name, currency.currency_code, "User".username, attr_details.attributeDetails
         FROM lastproductlogs
         INNER JOIN customer ON lastproductlogs.customer_id = customer.customerid
         INNER JOIN product ON lastproductlogs.product_id = product.product_id
         INNER JOIN currency ON lastproductlogs.currency_id = currency.currency_id
         INNER JOIN "User" ON lastproductlogs.userid = "User".userid
         LEFT JOIN (
             SELECT lastproductlogs.product_id, 
                    jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
             FROM lastproductlogs
             CROSS JOIN LATERAL (
                SELECT key::int AS attr_id, value::int AS val_id
                FROM jsonb_each_text(lastproductlogs.attributes::jsonb)
             ) AS attr_val
             LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
             LEFT JOIN value AS val ON val.value_id = attr_val.val_id
             WHERE lastproductlogs.date BETWEEN $1 AND $2
             GROUP BY lastproductlogs.product_id
         ) AS attr_details ON lastproductlogs.product_id = attr_details.product_id
         WHERE lastproductlogs.date BETWEEN $1 AND $2
         ORDER BY lastproductlogs.date ASC`,
    [data.startDate, data.endDate]
  );
};

const getAllWarehouse = () => {
  return process.pool.query(
    `SELECT 
      w.id, 
      w.product_id, 
      w.price, 
      w.quantity,
      w.attributes,
      w.customer_id,
      w.customer_city,
      w.customer_county,
      w.exchange_rate,
      c.currency_code,
      p.product_name,
      s.companyname,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
      lastproductwarehouse w
    LEFT JOIN LATERAL (
      SELECT key::int AS attr_id, value::int AS val_id
      FROM jsonb_each_text(w.attributes::jsonb)
    ) AS attr_val ON true
    LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
    LEFT JOIN value AS val ON val.value_id = attr_val.val_id
    LEFT JOIN currency AS c ON c.currency_id = w.currency_id
    LEFT JOIN product AS p ON p.product_id = w.product_id
    LEFT JOIN customer AS s ON s.customerid = w.customer_id
    GROUP BY 
      w.id, 
      w.product_id, 
      w.price, 
      w.quantity,
      w.attributes,
      w.customer_id,
      w.customer_city,
      w.customer_county,
      w.exchange_rate,
      c.currency_code,
      p.product_name,
      s.companyname
    ORDER BY 
      w.id ASC`
  );
};

const update = (data, client) => {
  const query =
    "UPDATE stocks SET stock = $1, last_edited_by = $2 WHERE stock_id = $3 RETURNING *";
  const values = [data.stock, data.userid, data.stock_id];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateSet = async (data, client) => {
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
  const result = await client.query(query, [
    data.stockDiff,
    data.userid,
    data.stock_id,
  ]);

  if (result.rowCount === 0) {
    // If no rows are updated, log an error or throw an exception
    console.error(`No stock entry updated for stock_id: ${data.stock_id}`);
    throw new Error(`No stock entry updated for stock_id: ${data.stock_id}`);
  }

  console.log("Stock update result:", result.rows[0]);
  return result.rows[0]; // Return the updated stock entry
};

const del = (id) => {
  return process.pool.query("DELETE FROM stocks WHERE stock_id = $1", [id]);
};

const getStock = (data, client) => {
  const query =
    "SELECT id FROM lastproductstocks WHERE product_id = $1 and attributes=$2";
  const values = [data.product_id, data.attributes];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertStock = (data, client) => {
  const query =
    "INSERT INTO lastproductstocks (product_id, attributes, price, quantity ) VALUES( $1, $2, $3, $4) RETURNING *";
  const values = [data.product_id, data.attributes, data.price, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

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
  getRangeLogs,
  update,
  updateSet,
  del,
  getLast,
  getLastSet,
  getAllWarehouse,
  getAllAttributeDetails,
  getAttributeDetails,
  getProductStocks,
};
