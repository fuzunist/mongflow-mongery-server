const { insertCurrency, currency, getName } = require("../services/Products");
const {
  getAll,
  updateEach,
  insert,
  getAllLogs,
  updateEachLog,
  insertLog,
  getStock,
  insertStock,
  updateStock,
  checkExistingMaterial,
  updateEachStock,
  updateEachStockInProduction
} = require("../services/RecipeMaterialStocks");
const httpStatus = require("http-status/lib");

const create = async (req, res) => {
  const { material } = req.body;

  const existingMaterial = await checkExistingMaterial(material);

  if (existingMaterial) {
    return res
      .status(httpStatus.BAD_REQUEST)
      .send({ error: "Girdiğiniz hammadde zaten mevcut!" });
  }

  try {
    insert({ material })
      .then(({ rows }) => res.status(httpStatus.CREATED).send(rows[0]))
      .catch((e) => {
        console.log(e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
      });
  } catch (e) {
    console.log(e);
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const updateStocks = async (req, res) => {
  const order_id = req.params.id;

  try {
    const result = await updateEachStock(order_id);
    res.status(httpStatus.ACCEPTED).send(result.rows);
  } catch (err) {
     console.log(err)
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: err.message });
  }
};

const updateStocksInProduction = async (req, res) => {
  const recipe_id = req.params.id;

  try {
    const result = await updateEachStockInProduction(recipe_id);
    res.status(httpStatus.ACCEPTED).send(result.rows);
  } catch (err) {
     console.log(err)
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: err.message });
  }
};

const get = (req, res) => {
  getAll()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((e) => {
      console.log(e);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
    });
};

const put = async (req, res) => {
  console.log(req.body);
  try {
    if (!req.body) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ error: "Body is empty." });
    }
    const id = req.params.id;
    console.log(id);
    updateEach(parseInt(id), req.body)
      .then(({ rows }) => {
        console.log("contr 45line", rows[0]);
        return res.status(httpStatus.ACCEPTED).send(rows[0]);
      })
      .catch((e) => {
        console.log(e);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
      });
  } catch (err) {
    console.log(err);
  }
};


const createLog = async (req, res) => {
  const client = await process.pool.connect();
  const data = req.body;

  await client.query("BEGIN");
  const { rows: currencyRows, rowCount: currencyRowCount } = await currency(
    client,
    data.currency
  );
  let currency_id;

  if (!currencyRowCount) {
    const { rows: insertCurrencyRows } = await insertCurrency(
      client,
      data.currency
    );
    currency_id = insertCurrencyRows[0].currency_id;
  } else currency_id = currencyRows[0].currency_id;

  data["currency_id"]= currency_id;

  insertLog(data, client)
    .then(async ({ rows: stockLogs }) => {
      const { rows: stock, rowCount: stockRowCount } = await getStock(
        { product_id: data.product_id, attributes: data.attributes },
        client
      );
      let stockResult;
      if (stockRowCount) {
        // burada update stock
        const { rows: stocks } = await updateStock(data, client);
        stockResult = stocks;
      } else {
        // burada insert stock
        const { rows: stocks } = await insertStock(data, client);
        stockResult = stocks;
      }
      const { rows: productRows } = await getName(data.product_id);
      global.socketio.emit("notification", {
        type: "stock",
        stock: {
          ...stockLogs[0],
          product_name: productRows[0].product_name,
          constituent_username: req.user.username,
          last_edited_by_username: req.user.username,
        },
        userid: req.user.userid,
      });
      res
        .status(httpStatus.CREATED)
        .send({ logs: stockLogs, stocks: stockResult });
      await client.query("COMMIT");
    })
    .catch(async (e) => {
      await client.query("ROLLBACK");

      if (e.constraint === "unique_stock_date")
        return res
          .status(httpStatus.BAD_REQUEST)
          .send({
            error:
              "A registration has already been created for the selected product today.",
          });

      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const getLogs = (req, res) => {
  getAllLogs()
    .then(({ rows }) => {
      return res.status(httpStatus.OK).send(rows);
    })
    .catch((e) => {
      console.log(e);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
    });
};

const putLog = async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body) {
      console.log("no body length fo putLog");
      const result = await process.pool.query(
        "SELECT * FROM recipemateriallogs"
      );
      return res.status(httpStatus.OK).send(result.rows);
    }

    const id = req.params.id;
    console.log(id);
    updateEachLog(parseInt(id), req.body)
      .then(({ rows }) => {
        console.log("contr 45line", rows[0]);
        return res.status(httpStatus.ACCEPTED).send(rows[0]);
      })
      .catch((e) => {
        console.log(e);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e });
      });
  } catch (err) {
    console.log(err);
  }
};
module.exports = { get, put, updateStocks, create, getLogs, putLog, createLog, updateStocksInProduction };