const insert = (data) => {
  return process.pool.query(
    "INSERT INTO rawmaterialstocks(material, cost, preprocesscost, stock) VALUES($1, $2, $3, $4) RETURNING *",
    [data.material, 0, 0, 0]
  );
};

const getAll = () => {
  return process.pool.query("SELECT * FROM rawmaterialstocks");
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
      data.date, data.userid, data.product_id, data.attributes, data.price, 
      data.quantity, data.waybill, data.payment_type, data.payment_date, 
      data.customer_id, data.customer_city, data.customer_county, 
      data.currency_id, data.exchange_rate, data.details
  ];

  if (client) return client.query(query, values);
  return process.pool.query(query, values);
}

const getAllLogs = () => {
  return process.pool.query("SELECT * FROM rawmateriallogs ORDER BY date ASC");
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

const getStock= (data, client)=>{
  const query = 'SELECT id FROM rawmaterialstocks WHERE product_id = $1 and attributes=$2'
  const values = [data.product_id, data.attributes]

  if (client) return client.query(query, values)
  return process.pool.query(query, values)
}

const insertStock = (data, client)=>{
  const query = 'INSERT INTO rawmaterialstocks (product_id, attributes, price, quantity ) VALUES( $1, $2, $3, $4) RETURNING *'
  const values = [data.product_id, data.attributes, data.price, data.quantity]

  if (client) return client.query(query, values)
  return process.pool.query(query, values)
}

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

  updateStock,
  insertStock,
  getStock
};
