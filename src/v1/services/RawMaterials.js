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

const insertLog = (data) => {
  return process.pool.query(
    "INSERT INTO rawmateriallogs(item_id, date, price, quantity, last_edited_by, waybill, supplier) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
      data.item_id,
      data.date,
      parseFloat(data.price),
      data.quantity,
      data.last_edited_by,
      data.waybill,
      data.supplier,
    ]
  );
};

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

module.exports = {
  getAll,
  updateEach,
  insert,
  insertLog,
  updateEachLog,
  getAllLogs,
};
