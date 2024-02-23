const httpStatus = require("http-status/lib");
const {
  insert,
  getAll,
  update,
  del,
  updateOrderStatus,
  updateStatus,
  _getOrderCounter,
  _insertOrderCounter,
  _updateOrderCounter,
  getOne,
  updateOrderStatusSet,
  patchSome,
} = require("../services/Orders");
const { currency, insertCurrency } = require("../services/Products");
const { getOne: getCustomer } = require("../services/Customers");
const {
  getLastSet,
  getLast,
  update: updateStock,
  updateSet,
} = require("../services/Stocks");
const {
  dateToIsoFormatWithTimezoneOffset,
  missingNumber,
  delInArray,
} = require("../scripts/utils/helper");
const { delAllOfOrder } = require("../services/Recipes");

const updateSome = async (req, res) => {
  try {
    const body = req.body;
    if (!body) {
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ error: "Eklenecek data yok" });
    }

    const order_id = req.params.id;
    console.log("order id:", order_id);
    await patchSome(parseInt(order_id), body)
      .then(({ rows }) => {
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

const create = async (req, res) => {
  const client = await process.pool.connect();

  const { userid, username, usertype } = req.user;

  try {
    await client.query("BEGIN");
    const { rows: currenyRows, rowCount: currencyRowCount } = await currency(
      client,
      req.body.currency_code
    );
    let currency_id;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        req.body.currency_code
      );
      currency_id = insertCurrencyRows[0].currency_id;
    } else currency_id = currenyRows[0].currency_id;

    const { rows } = await insert(client, {
      userid: userid,
      currency_id,
      ...req.body,
      status: // type string
        usertype === "admin"
          ? "111"
          : usertype === "boss"
          ? "222"
          : usertype === "stock_manager"
          ? "333"
          : usertype === "production_manager"
          ? "444"
          : usertype === "domestic_market_manager"
          ? "555"
          : usertype === "domestic_market_marketing"
          ? "666"
          : usertype === "foreign_market_manager"
          ? "777"
          : usertype === "foreign_market_marketing" ?? "888",
      approver_id:
        usertype === "admin" ||
        usertype === "stock_manager" ||
        usertype === "boss"
          ? userid
          : null,
    });

    const { rows: customerRows } = await getCustomer(req.body.customer_id);

    await client.query("COMMIT");
    client.release();

    const order = {
      ...rows[0],
      username,
      currency_code: req.body.currency_code,
      customer: { ...customerRows[0] },
      approver:
        usertype === "admin" || usertype === "stock_manager" ? username : null,
    };

    global.socketio.emit("notification", {
      type: "order",
      order,
      userid,
    });
    res.status(httpStatus.CREATED).send(order);
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const get = (req, res) => {
  getAll()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((e) =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: e.message })
    );
};

const putSet = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const { sets, order_status, stockDiffs, attributes } = req.body;

    console.log("Request body in the putSet dunction:", req.body);

    if (!sets) {
      throw new Error("Required data missing: sets");
    }
    if (!order_status) {
      throw new Error("Required data missing: order_status");
    }
    if (!stockDiffs || !Array.isArray(stockDiffs)) {
      throw new Error(
        "Required data missing: stockDiffs or stockDiffs is not an array"
      );
    }

    const attributesArray = attributes;

    console.log(
      "Attributes Array in the putSet function before we sent it to getLastSet function ",
      attributesArray
    );
    const lastStocks = await getLastSet(attributesArray, client);
    if (lastStocks.length === 0) {
      throw new Error("No stock entries found for the provided attributes");
    }

    // Update stocks
    sets.forEach((set, setIndex) => {
      set.products.forEach(async (product, productIndex) => {
        // Add async here
        const stockDiffIndex = setIndex * set.products.length + productIndex;
        const stockDiffValue = stockDiffs[stockDiffIndex];

        if (typeof stockDiffValue !== "number") {
          throw new Error(
            `Missing or invalid stockDiff for product at index ${productIndex} in set with set_id ${set.set_id}`
          );
        }

        // Find the corresponding stock entry for the product's attributes
        const productAttributesString = attributesArray[stockDiffIndex];
        const lastStockEntry = lastStocks.find(
          (stock) => stock.attributes === productAttributesString
        );

        if (!lastStockEntry) {
          throw new Error(
            `No stock entry found for product with attributes ${productAttributesString}`
          );
        }

        await updateSet(
          {
            userid: req.user.userid,
            stockDiff: stockDiffValue,
            stock_id: lastStockEntry.stock_id,
          },
          client
        );
      });
    });

    await client.query("COMMIT");
    res.status(200).send({ message: "Order updated successfully" });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error during transaction:", e);
    res.status(500).send({ error: e.message });
  } finally {
    client.release();
  }
};

const put = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    console.log(
      "attributes in the put function before send it to getLast function",
      req.body.product_attributes
    );
    // const { rows: lastStock } = await getLast(
    //   req.body.product_attributes,
    //   client
    // );
    // if (lastStock.length === 0) throw "No stock found for the product";

    const { rows, rowCount } = await updateOrderStatus(
      { order_id: req.params.id, ...req.body },
      client
    );
    if (!rowCount) throw "No order found with the provided order ID";

    // const newStock = lastStock[0].stock - req.body.stock_diff;
    // if (newStock < 0) throw "There is not enough stock for the product";
    // await updateStock(
    //   {
    //     userid: req.user.userid,
    //     stock: newStock,
    //     stock_id: lastStock[0].stock_id,
    //   },
    //   client
    // );

    await client.query("COMMIT");
    client.release();

    // const stock = {
    //   ...lastStock[0],
    //   stock: newStock,
    //   last_edited_by_username: req.user.username,
    // };

    // global.socketio.emit("notification", {
    //   type: "stock_update",
    //   stock,
    //   userid: req.user.userid,
    // });
    res.status(httpStatus.CREATED).send({ order: rows[0], stock: null });
  } catch (e) {
    console.log(e);
    client.release();
    if (
      e === "No order found with the provided order ID" ||
      e === "No stock found for the product" ||
      e === "There is not enough stock for the product"
    )
      return res.status(httpStatus.BAD_REQUEST).send({ error: e });
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const patch = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    const { rows: currenyRows, rowCount: currencyRowCount } = await currency(
      client,
      req.body.currency_code
    );
    let currency_id;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        req.body.currency_code
      );
      currency_id = insertCurrencyRows[0].currency_id;
    } else currency_id = currenyRows[0].currency_id;

    const { rows } = await update(client, {
      order_id: req.params.id,
      currency_id,
      ...req.body,
    });

    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send(rows[0]);
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const patchStatus = (req, res) => {
  updateStatus({
    userid: req.user.userid,
    order_id: req.params.id,
    ...req.body,
  })
    .then(({ rows }) => {
      if (rows.length === 0)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });

      const order = {
        ...rows[0],
        approver: req.user.username,
      };

      global.socketio.emit("notification", {
        type: "order_update",
        order,
        userid: req.user.userid,
      });
      res.status(httpStatus.OK).send(order);
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

const remove = async (req, res) => {
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");
    await delAllOfOrder(req.params.id);

    const { rows } = await getOne(req.params.id, client);
    if (rows.length === 0) throw "There is no such record.";

    const today = dateToIsoFormatWithTimezoneOffset(new Date());
    const _today = new Date(today);
    const date = `${_today.getFullYear()}${String(
      _today.getMonth() + 1
    ).padStart(2, "0")}${String(_today.getDate()).padStart(2, "0")}`;

    const orderDate = String(rows[0].order_number.split("-")[0]);
    const orderCounter = parseInt(rows[0].order_number.split("-")[2]);
    const orderSuffix = String(rows[0].order_number.split("-")[3]);
    if (
      today ===
      dateToIsoFormatWithTimezoneOffset(
        new Date(
          `${orderDate.slice(0, 4)}-${orderDate.slice(4, 6)}-${orderDate.slice(
            6
          )}`
        )
      )
    ) {
      const { rows: orderCounterRows } = await _getOrderCounter(
        { suffix: orderSuffix },
        client
      );
      const counter = delInArray(orderCounterRows[0].counter, orderCounter);
      await _updateOrderCounter({ counter, date, suffix: orderSuffix }, client);
    }

    await del(req.params.id, client);

    await client.query("COMMIT");
    client.release();

    global.socketio.emit("notification", {
      type: "order_del",
      orderid: req.params.id,
      userid: req.user.userid,
    });

    res.status(httpStatus.OK).send({ message: "Order deleted successfully." });
  } catch (e) {
    console.log(e);
    client.release();
    if (e === "There is no such record.")
      return res
        .status(httpStatus.BAD_REQUEST)
        .send({ error: "There is no such record." });
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const createOrderNumber = async (req, res) => {
  const client = await process.pool.connect();
  const { usertype } = req.user;

  try {
    await client.query("BEGIN");
    const today = dateToIsoFormatWithTimezoneOffset(new Date());
    const _today = new Date(today);
    const date = `${_today.getFullYear()}${String(
      _today.getMonth() + 1
    ).padStart(2, "0")}${String(_today.getDate()).padStart(2, "0")}`;

    const suffix =
      usertype === "domestic_market_manager" ||
      usertype === "domestic_market_marketing"
        ? "A"
        : usertype === "foreign_market_manager" ||
          usertype === "foreign_market_marketing"
        ? "B"
        : "C";

    let orderCounter = 10;
    const { rows: orderCounterRows } = await _getOrderCounter(
      { suffix },
      client
    );
    if (orderCounterRows.length === 0)
      await _insertOrderCounter({
        suffix,
        date: today,
        counter: [orderCounter],
      });
    else {
      const { counter, date: _date } = orderCounterRows[0];
      const newCounter = [];
      if (dateToIsoFormatWithTimezoneOffset(new Date(_date)) === today) {
        newCounter.push(...counter);
        const miss = missingNumber(newCounter);
        newCounter.length > 0 &&
          (orderCounter = miss ?? newCounter[newCounter.length - 1] + 1);
      }
      newCounter.push(orderCounter);
      await _updateOrderCounter({ suffix, date: today, counter: newCounter });
    }
    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send({
      order_number: `${date}-MON-${orderCounter
        .toString()
        .padStart(3, "0")}-${suffix}`,
    });
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const delOrderNumber = async (req, res) => {
  const client = await process.pool.connect();
  const { order_number } = req.params;

  try {
    await client.query("BEGIN");
    const orderCounter = parseInt(order_number.split("-")[2]);
    const orderSuffix = String(order_number.split("-")[3]);

    const { rows: orderCounterRows } = await _getOrderCounter(
      { suffix: orderSuffix },
      client
    );
    const { counter, date } = orderCounterRows[0];

    const newCounter = delInArray(counter, orderCounter);
    await _updateOrderCounter({
      suffix: orderSuffix,
      date,
      counter: newCounter,
    });

    await client.query("COMMIT");
    client.release();
    res
      .status(httpStatus.OK)
      .send({ message: "Order Number deleted successfully." });
  } catch (e) {
    console.log(e);
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

module.exports = {
  create,
  get,
  put,
  putSet,
  patch,
  patchStatus,
  remove,
  createOrderNumber,
  delOrderNumber,
  updateSome,
};
