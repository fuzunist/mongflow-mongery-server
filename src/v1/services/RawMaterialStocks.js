const insert = (data) => {
  return process.pool.query(
    "INSERT INTO rawmaterialstocks(material, cost, preprocesscost, stock) VALUES($1, $2, $3, $4) RETURNING *",
    [data.material, 0, 0, 0]
  );
};

const getAll = () => {
  return process.pool.query(
    `SELECT 
    s.id, s.product_id, s.price, s.quantity, p.product_name,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
    rawmaterialstocks s
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

const updateEach = async (id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE rawmaterialstocks SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const insertLog = (data, client) => {
  const query = `
      INSERT INTO rawmateriallogs (
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
    data.details,
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getAllLogs = () => {
  return process.pool.query("SELECT * FROM rawmateriallogs ORDER BY date ASC");
};

const getAllAttributeDetails = (id, client) => {
  const query = `SELECT rawmateriallogs.product_id, 
                jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
         FROM rawmateriallogs
         LEFT JOIN LATERAL (
             SELECT key::int AS attr_id, value::int AS val_id
             FROM jsonb_each_text(rawmateriallogs.attributes::jsonb)
         ) AS attr_val ON true
         LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
         LEFT JOIN value AS val ON val.value_id = attr_val.val_id
         WHERE rawmateriallogs.id= $1
         GROUP BY rawmateriallogs.product_id`;

  const values = [id];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getRangeLogs = (data) => {
  return process.pool.query(
      `SELECT rawmateriallogs.*, customer.companyname, product.product_name, currency.currency_code, "User".username, attr_details.attributeDetails
       FROM rawmateriallogs
       INNER JOIN customer ON rawmateriallogs.customer_id = customer.customerid
       INNER JOIN product ON rawmateriallogs.product_id = product.product_id
       INNER JOIN currency ON rawmateriallogs.currency_id = currency.currency_id
       INNER JOIN "User" ON rawmateriallogs.userid = "User".userid
       LEFT JOIN (
           SELECT rawmateriallogs.product_id, 
                  jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
           FROM rawmateriallogs
           CROSS JOIN LATERAL (
              SELECT key::int AS attr_id, value::int AS val_id
              FROM jsonb_each_text(rawmateriallogs.attributes::jsonb)
           ) AS attr_val
           LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
           LEFT JOIN value AS val ON val.value_id = attr_val.val_id
           WHERE rawmateriallogs.date BETWEEN $1 AND $2
           GROUP BY rawmateriallogs.product_id
       ) AS attr_details ON rawmateriallogs.product_id = attr_details.product_id
       WHERE rawmateriallogs.date BETWEEN $1 AND $2
       ORDER BY rawmateriallogs.date ASC`,
      [data.startDate, data.endDate]
  );
}

const getAllWarehouse = () => {
  return process.pool.query(
    `SELECT * FROM lastproductwarehouse ORDER BY id ASC`
  );
};

const updateEachLog = async (id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE rawmateriallogs SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const getStock = (data, client) => {
  const query =
    "SELECT id FROM rawmaterialstocks WHERE product_id = $1 and attributes=$2";
  const values = [data.product_id, data.attributes];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertStock = (data, client) => {
  const query =
    "INSERT INTO rawmaterialstocks (product_id, attributes, price, quantity ) VALUES( $1, $2, $3, $4) RETURNING *";
  const values = [data.product_id, data.attributes, data.price, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateStock = (data, client) => {
  const query = `
  UPDATE rawmaterialstocks 
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
  getAll,
  updateEach,
  insert,
  insertLog,
  updateEachLog,
  getAllLogs,
  getRangeLogs,
  updateStock,
  insertStock,
  getStock,
  getAllAttributeDetails
};
