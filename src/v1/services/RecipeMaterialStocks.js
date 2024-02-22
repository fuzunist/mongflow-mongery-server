const insert = (data) => {
  return process.pool.query(
    "INSERT INTO recipematerialstocks(material, cost, stock) VALUES($1, $2, $3) RETURNING *",
    [data.material, 0, 0]
  );
};

const checkExistingMaterial = async (material) => {
  const query = "SELECT * FROM recipematerialstocks WHERE material = $1";
  const result = await process.pool.query(query, [material]);

  return result.rows.length > 0;
};

const getAll = () => {
  return process.pool.query(
    `SELECT 
    s.id, s.product_id, s.price, s.quantity, p.product_name,
      jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
    FROM 
    recipematerialstocks s
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

const updateEachStockInProduction = async (recipe_id) => {
  const client = await process.pool.connect();
  const query = "SELECT details FROM productionrecipes WHERE id=$1";
  const { rows } = await process.pool.query(query, [recipe_id]);
  console.log(rows);
  const recipe_details = rows;
  for (const recipe of recipe_details) {
    await client.query("BEGIN");

    try {
      const keys = Object.keys(recipe.details);
      for (const key of keys) {
        const stockReduction = recipe.details[key];
        const id = parseInt(key, 10); // Assuming the key represents an ID
        console.log("id of material: ", id);
        const selectQuery = {
          text: "SELECT * FROM recipematerialstocks WHERE id = $1",
          values: [id],
        };

        const { rows } = await client.query(selectQuery);

        if (rows.length === 1) {
          const row = rows[0];
          const updatedStock = row.stock - stockReduction;

          if (updatedStock < 0) {
            console.error(`Negative stock for ID ${id}`);
            await client.query("ROLLBACK");
            throw new Error("Negative stock encountered");
          }
          const updateQuery = {
            text: "UPDATE recipematerialstocks SET stock = $1 WHERE id = $2",
            values: [updatedStock, id],
          };

          await client.query(updateQuery);
        } else {
          console.error(`No or multiple rows found for ID ${id}`);
          throw new Error("Error processing details");
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transaction rolled back:", error);
      throw new Error("Error processing details");
    }
  }

  const stocks = await process.pool.query(
    "SELECT * FROM recipematerialstocks ORDER BY id ASC"
  );

  return stocks;
};

const updateEachStock = async (order_id) => {
  const client = await process.pool.connect();
  const query = "SELECT details FROM recipes WHERE order_id=$1";
  const { rows } = await process.pool.query(query, [parseInt(order_id)]);
  console.log(rows);
  const recipe_details = rows;
  for (const recipe of recipe_details) {
    await client.query("BEGIN");

    try {
      const keys = Object.keys(recipe.details);
      for (const key of keys) {
        const stockReduction = recipe.details[key];
        const id = parseInt(key, 10); // Assuming the key represents an ID
        console.log("id of material: ", id);
        const selectQuery = {
          text: "SELECT * FROM recipematerialstocks WHERE id = $1",
          values: [id],
        };

        const { rows } = await client.query(selectQuery);

        if (rows.length === 1) {
          const row = rows[0];
          const updatedStock = row.stock - stockReduction;

          if (updatedStock < 0) {
            console.error(`Negative stock for ID ${id}`);
            await client.query("ROLLBACK");
            throw new Error("Negative stock encountered");
          }
          const updateQuery = {
            text: "UPDATE recipematerialstocks SET stock = $1 WHERE id = $2",
            values: [updatedStock, id],
          };

          await client.query(updateQuery);
        } else {
          console.error(`No or multiple rows found for ID ${id}`);
          throw new Error("Error processing details");
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transaction rolled back:", error);
      throw new Error("Error processing details");
    }
  }

  const stocks = await process.pool.query(
    "SELECT * FROM recipematerialstocks ORDER BY id ASC"
  );

  return stocks;
};

const updateEach = async (id, data) => {
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE recipematerialstocks SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const insertLog = (data, client) => {
  const query = `
      INSERT INTO recipemateriallogs (
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
  return process.pool.query(
    "SELECT * FROM recipemateriallogs ORDER BY date ASC"
  );
};

const getAllAttributeDetails = (id, client) => {
  const query = `SELECT recipemateriallogs.product_id, 
                jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
         FROM recipemateriallogs
         LEFT JOIN LATERAL (
             SELECT key::int AS attr_id, value::int AS val_id
             FROM jsonb_each_text(recipemateriallogs.attributes::jsonb)
         ) AS attr_val ON true
         LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
         LEFT JOIN value AS val ON val.value_id = attr_val.val_id
         WHERE recipemateriallogs.id= $1
         GROUP BY recipemateriallogs.product_id`;

  const values = [id];
  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const getRangeLogs = (data) => {

  return process.pool.query(
    `SELECT recipemateriallogs.*, customer.companyname, product.product_name, currency.currency_code, "User".username, attr_details.attributeDetails
       FROM recipemateriallogs
       INNER JOIN customer ON recipemateriallogs.customer_id = customer.customerid
       INNER JOIN product ON recipemateriallogs.product_id = product.product_id
       INNER JOIN currency ON recipemateriallogs.currency_id = currency.currency_id
       INNER JOIN "User" ON recipemateriallogs.userid = "User".userid
       LEFT JOIN (
           SELECT recipemateriallogs.product_id, 
                  jsonb_object_agg(attr.attribute_name, val.value) as attributeDetails
           FROM recipemateriallogs
           CROSS JOIN LATERAL (
              SELECT key::int AS attr_id, value::int AS val_id
              FROM jsonb_each_text(recipemateriallogs.attributes::jsonb)
           ) AS attr_val
           LEFT JOIN attribute AS attr ON attr.attribute_id = attr_val.attr_id
           LEFT JOIN value AS val ON val.value_id = attr_val.val_id
           WHERE recipemateriallogs.date BETWEEN $1 AND $2
           GROUP BY recipemateriallogs.product_id
       ) AS attr_details ON recipemateriallogs.product_id = attr_details.product_id
       WHERE recipemateriallogs.date BETWEEN $1 AND $2
       ORDER BY recipemateriallogs.date ASC`,
    [data.startDate, data.endDate]
  );
};

const getAllWarehouse = () => {
  return process.pool.query(
    `SELECT * FROM lastproductwarehouse ORDER BY id ASC`
  );
};

const updateEachLog = async (id, data) => {
  console.log("update each log id, data", id, data);
  const columns = Object.keys(data).join(", "); // Get column names dynamically
  const setValues = Object.keys(data)
    .map((key, index) => `${key} = $${index + 1}`)
    .join(", "); // Create SET values

  const query = `UPDATE recipemateriallogs SET ${setValues} WHERE id = $${
    Object.keys(data).length + 1
  } RETURNING *`;
  const values = [...Object.values(data), id];

  return process.pool.query(query, values);
};

const getStock = (data, client) => {
  const query =
    "SELECT id FROM recipematerialstocks WHERE product_id = $1 and attributes=$2";
  const values = [data.product_id, data.attributes];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const insertStock = (data, client) => {
  const query =
    "INSERT INTO recipematerialstocks (product_id, attributes, price, quantity ) VALUES( $1, $2, $3, $4) RETURNING *";
  const values = [data.product_id, data.attributes, data.price, data.quantity];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
};

const updateStock = (data, client) => {
  const query = `
  UPDATE recipematerialstocks 
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
  getStock,
  insertStock,
  updateStock,
  updateEachLog,
  getAllLogs,
  getRangeLogs,
  checkExistingMaterial,
  updateEachStock,
  updateEachStockInProduction,
  getAllAttributeDetails
};
