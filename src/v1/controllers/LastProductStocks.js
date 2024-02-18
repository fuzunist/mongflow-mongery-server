const httpStatus = require("http-status/lib");
const {
  insertLog,
  getStock,
  getRangeLogs,
  update,
  del,
  updateStock,
  insertStock,
  insertWarehouseStock,
  updateWarehouseStock,
  getWarehouseStock,
  getAllWarehouse,
  getAllAttributeDetails,
  getProductStocks
} = require("../services/LastProductStocks");
const {
  getName,
  currency,
  insertCurrency,
  getCurrency,
} = require("../services/Products");
const { getOne, getCustomerName } = require("../services/Customers");
const { findOne } = require("../services/Users");

const create = async (req, res) => {
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

      const { rows: warehouseRows, rowCount: stockInWarehouseCount } =
        await getWarehouseStock(data, client);

      let updatedRow;
      let insertedRow;
      if (stockInWarehouseCount) {
        updatedRow = await updateWarehouseStock(
          {
            id: warehouseRows[0].id,
            price: data.price,
            quantity: data.quantity,
          },
          client
        );
      } else {
        insertedRow = await insertWarehouseStock(data, client);
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

      const { rows: user } = await findOne(req.user.userid);
      const username = user[0].username;
      const customerResult = await getCustomerName(data.customer_id, client);
      const companyname = customerResult.rows[0].companyname;
      const product_name = productRows[0].product_name;

      const { rows: currency } = await getCurrency(stockLogs[0].currency_id, client);
      const currency_code = currency[0].currency_code;
      const { rows: attr } = await getAllAttributeDetails(stockLogs[0].id, client);
       console.log("attr",attr)
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
        updatedWarehouseStock: updatedRow?.rows[0] ?? null,
        insertedWarehouseStock: insertedRow?.rows[0] ?? null,
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

const getAllWarehouseStock = (req, res) => {
  getAllWarehouse()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const getAllProductStocks = (req, res) => {
  getProductStocks()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const getLogsByDate = async (req, res) => {
  await getRangeLogs({ ...req.query })
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((err) => {
      console.log(err);
      return res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const put = (req, res) => {
  update({ stock_id: req.params.id, userid: req.user.userid, ...req.body })
    .then(({ rows, rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.FORBIDDEN)
          .send({ message: "There is no such record." });
      res.status(httpStatus.CREATED).send(rows[0]);
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const remove = (req, res) => {
  del(req.params.id)
    .then(({ rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      res
        .status(httpStatus.OK)
        .send({ message: "Stock deleted successfully." });
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

module.exports = {
  create,
  getLogsByDate,
  getAllWarehouseStock,
  put,
  remove,
  getAllProductStocks
};
