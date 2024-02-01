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
    "SELECT * FROM recipematerialstocks ORDER BY id DESC "
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

const insertLog = (data) => {
  return process.pool.query(
    "INSERT INTO recipemateriallogs(item_id, date, price, quantity, last_edited_by, waybill, supplier) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *",
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
  return process.pool.query(
    "SELECT * FROM recipemateriallogs ORDER BY date ASC"
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

module.exports = {
  getAll,
  updateEach,
  insert,
  insertLog,
  updateEachLog,
  getAllLogs,
  checkExistingMaterial,
  updateEachStock,
  updateEachStockInProduction
};
