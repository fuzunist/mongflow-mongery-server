const { getCustomerName } = require("../services/Customers");
const {
  insertCurrency,
  currency,
  getName,
  getCurrency,
} = require("../services/Products");
const {
  getAll,
  updateEach,
  insert,
  getAllLogs,
  getRangeLogs,
  updateEachLog,
  insertLog,
  getStock,
  insertStock,
  updateStock,
  checkExistingMaterial,
  updateEachStock,
  updateEachStockInProduction,
  getAllAttributeDetails,
} = require("../services/RecipeMaterialStocks");
const httpStatus = require("http-status/lib");
const { findOne } = require("../services/Users");
const { getAttributeDetails } = require("../services/LastProductStocks");

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
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: err.message });
  }
};

const updateStocksInProduction = async (req, res) => {
  const recipe_id = req.params.id;

  try {
    const result = await updateEachStockInProduction(recipe_id);
    res.status(httpStatus.ACCEPTED).send(result.rows);
  } catch (err) {
    console.log(err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: err.message });
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

  data["currency_id"] = currency_id;

  insertLog(data, client)
    .then(async ({ rows: stockLogs }) => {
      const { rows: stock, rowCount: stockRowCount } = await getStock(
        { product_id: data.product_id, attributes: data.attributes },
        client
      );

      const { rows: productRows } = await getName(data.product_id);
      const product_name = productRows[0].product_name;

      let stockResult;
      if (stockRowCount) {
        // burada update stock
        const { rows: stocks } = await updateStock(data, client);
        const attributeDetails = await getAttributeDetails(
          stocks[0].attributes,
          client
        );
        stockResult = {
          ...stocks[0],
          attributedetails: attributeDetails,
          product_name: product_name,
        };
      } else {
        // burada insert stock
        const { rows: stocks } = await insertStock(data, client);
        const attributeDetails = await getAttributeDetails(
          stocks[0].attributes,
          client
        );
        stockResult = {
          ...stocks[0],
          attributedetails: attributeDetails,
          product_name: product_name,
        };
      }
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

      const { rows: user } = await findOne(req.user.userid);
      const username = user[0].username;
      const customerResult = await getCustomerName(data.customer_id, client);
      const companyname = customerResult.rows[0].companyname;

      const { rows: currency } = await getCurrency(
        stockLogs[0].currency_id,
        client
      );
      const currency_code = currency[0].currency_code;
      const { rows: attr } = await getAllAttributeDetails(
        stockLogs[0].id,
        client
      );
      console.log("attr", attr);
      const attributedetails = attr[0].attributedetails;

      res.status(httpStatus.CREATED).send({
        logs: {
          ...stockLogs[0],
          companyname,
          attributedetails,
          product_name,
          username,
          currency_code,
        },
        stocks: stockResult,
      });
      await client.query("COMMIT");
    })
    .catch(async (e) => {
      await client.query("ROLLBACK");

      if (e.constraint === "unique_stock_date")
        return res.status(httpStatus.BAD_REQUEST).send({
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

const getLogsByDate = (req, res) => {
  getRangeLogs({ ...req.query })
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((e) => {
      console.log(e);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
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
module.exports = {
  get,
  put,
  updateStocks,
  create,
  getLogs,
  getLogsByDate,
  putLog,
  createLog,
  updateStocksInProduction,
};
