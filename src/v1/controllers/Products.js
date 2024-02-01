const httpStatus = require("http-status/lib");
const {
  insert,
  getAll,
  currency,
  insertCurrency,
  insertCurrencyId,
  getAttribute,
  insertAttribute,
  insertValue,
  insertExtraPrice,
  del,
  delProductDefaultPrice,
  delAttribute,
  delExtraPrice,
  delValue,
  update,
  updateProductDefaultPrice,
  updateAttribute,
  updateValue,
  updateExtraPrice,
  getOne,
} = require("../services/Products");

const create = async (req, res) => {
  const userid = req.user.userid;
  const { productName, defaultPrice, defaultCurrency, attributes, type } =
    req.body;
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const product = {
      product_id: null,
      product_type: type,
      product_name: productName,
      default_price: defaultPrice,
      currency_code: defaultCurrency,
      attributes: [],
    };

    const { rows: currenyRows, rowCount: currencyRowCount } = await currency(
      client,
      product.currency_code
    );
    let currencyId;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        product.currency_code
      );
      currencyId = insertCurrencyRows[0].currency_id;
    } else currencyId = currenyRows[0].currency_id;

    const { rows: insertRows } = await insert(
      client,
      product.product_name,
      userid,
      product.product_type
    );
    product.product_id = insertRows[0].product_id;

    await insertCurrencyId(
      client,
      product.product_id,
      currencyId,
      product.default_price
    );

    for (let attr of attributes) {
      const attribute = {
        attribute_id: null,
        attribute_name: attr.attribute_name,
        values: [],
      };

      const { rows: getAttributeRows, rowCount: getAttributeRowCount } =
        await getAttribute(
          client,
          attribute.attribute_name,
          product.product_id
        );
      if (!getAttributeRowCount) {
        const { rows: insertAttributeRows } = await insertAttribute(
          client,
          attribute.attribute_name,
          product.product_id
        );
        attribute.attribute_id = insertAttributeRows[0].attribute_id;
      } else attribute.attribute_id = getAttributeRows[0].attribute_id;

      for (let val of attr.values) {
        const value = {
          value_id: null,
          value: val.value,
          extra_price: val.extra_price || "0",
        };

        const { rows: insertValueRows } = await insertValue(
          client,
          value.value,
          product.product_id,
          attribute.attribute_id
        );
        value.value_id = insertValueRows[0].value_id;
        await insertExtraPrice(
          client,
          value.value_id,
          currencyId,
          value.extra_price
        );

        attribute.values.push(value);
      }

      product.attributes.push(attribute);
    }

    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send(product);
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
    .catch((e) => {
      console.log(e);
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." });
    });
};

const put = async (req, res) => {
  const data = { product_id: req.params.id, ...req.body };
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const product = {
      product_id: parseInt(data.product_id),
      product_name: data.productName,
      default_price: data.defaultPrice,
      currency_code: data.defaultCurrency,
      attributes: [],
    };

    const { rows: getOneRows } = await getOne(client, product.product_id);
    const oldProduct = getOneRows[0];

    await update(client, product);

    const { rows: currenyRows, rowCount: currencyRowCount } = await currency(
      client,
      product.currency_code
    );
    let currencyId;

    if (!currencyRowCount) {
      const { rows: insertCurrencyRows } = await insertCurrency(
        client,
        product.currency_code
      );
      currencyId = insertCurrencyRows[0].currency_id;
    } else currencyId = currenyRows[0].currency_id;
    await updateProductDefaultPrice(
      client,
      product.default_price,
      currencyId,
      product.product_id
    );

    const deletedAttributes = oldProduct.attributes.filter((oldAttr) => {
      if (
        !data.attributes.find(
          (attr) => attr.attribute_id === oldAttr.attribute_id
        )
      )
        return oldAttr;
    });

    for (const attr of deletedAttributes) {
      const { rowCount: delAttributeRowCount } = await delAttribute(
        client,
        null,
        attr.attribute_id
      );
      if (!delAttributeRowCount) {
        client.release();
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      }

      for (const val of attr.values) {
        const { rowCount: delValueRowCount, rows: delValueRows } =
          await delValue(client, null, val.value_id);
        if (!delValueRowCount) {
          client.release();
          return res
            .status(httpStatus.NOT_FOUND)
            .send({ message: "There is no such record." });
        }

        const { rowCount: delExtraPriceRowCount } = await delExtraPrice(
          client,
          val.value_id
        );
        if (!delExtraPriceRowCount) {
          client.release();
          return res
            .status(httpStatus.NOT_FOUND)
            .send({ message: "There is no such record." });
        }
      }
    }

    const updatedAttributes = oldProduct.attributes.filter((oldAttr) => {
      if (
        data.attributes.find(
          (attr) => attr.attribute_id === oldAttr.attribute_id
        )
      )
        return oldAttr;
    });

    const oldValues = [];
    updatedAttributes.forEach((updatedAttr) => {
      oldValues.push(...updatedAttr.values);
    });

    const newValues = [];
    data.attributes.forEach((attr) => {
      newValues.push(...attr.values);
    });

    const deletedValues = oldValues.filter((oldVal) => {
      if (!newValues.find((val) => val.value_id === oldVal.value_id))
        return oldVal;
    });

    for (const val of deletedValues) {
      const { rowCount: delValueRowCount, rows: delValueRows } = await delValue(
        client,
        null,
        val.value_id
      );
      if (!delValueRowCount) {
        client.release();
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      }

      const { rowCount: delExtraPriceRowCount } = await delExtraPrice(
        client,
        val.value_id
      );
      if (!delExtraPriceRowCount) {
        client.release();
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      }
    }

    for (const attr of data.attributes) {
      const attribute = {
        attribute_id: attr?.attribute_id,
        attribute_name: attr.attribute_name,
        values: [],
      };

      if (attribute.attribute_id) {
        await updateAttribute(client, attr.attribute_name, attr.attribute_id);
      } else {
        const { rows: getAttributeRows, rowCount: getAttributeRowCount } =
          await getAttribute(
            client,
            attribute.attribute_name,
            product.product_id
          );
        if (!getAttributeRowCount) {
          const { rows: insertAttributeRows } = await insertAttribute(
            client,
            attribute.attribute_name,
            product.product_id
          );
          attribute.attribute_id = insertAttributeRows[0].attribute_id;
        } else attribute.attribute_id = getAttributeRows[0].attribute_id;
      }

      for (const val of attr.values) {
        const value = {
          value_id: val?.value_id,
          value: val.value,
          extra_price: val?.extra_price || "0",
        };

        if (value.value_id) {
          await updateValue(client, value.value, attr.attribute_id);
          await updateExtraPrice(
            client,
            value.extra_price,
            currencyId,
            value.value_id
          );
        } else {
          const { rows: insertValueRows } = await insertValue(
            client,
            value.value,
            product.product_id,
            attribute.attribute_id
          );
          value.value_id = insertValueRows[0].value_id;
          await insertExtraPrice(
            client,
            value.value_id,
            currencyId,
            value.extra_price
          );
        }

        attribute.values.push(value);
      }

      product.attributes.push(attribute);
    }

    await client.query("COMMIT");
    client.release();
    res.status(httpStatus.CREATED).send(product);
  } catch (e) {
     console.log(e)
    client.release();
    res
      .status(httpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: "An error occurred." });
  }
};

const remove = async (req, res) => {
  const product_id = req.params.id;
  const client = await process.pool.connect();

  try {
    await client.query("BEGIN");

    const { rowCount: delRowCount } = await del(client, product_id);
    if (!delRowCount) {
      client.release();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    const { rowCount: delProductDefaultPriceRowCount } =
      await delProductDefaultPrice(client, product_id);
    if (!delProductDefaultPriceRowCount) {
      client.release();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    const { rowCount: delAttributeRowCount } = await delAttribute(
      client,
      product_id
    );
    if (!delAttributeRowCount) {
      client.release();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    const { rowCount: delValueRowCount, rows: delValueRows } = await delValue(
      client,
      product_id
    );
    if (!delValueRowCount) {
      client.release();
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ message: "There is no such record." });
    }

    for (let row of delValueRows) {
      const { rowCount: delExtraPriceRowCount } = await delExtraPrice(
        client,
        row.value_id
      );
      if (!delExtraPriceRowCount) {
        client.release();
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      }
    }

    await client.query("COMMIT");
    client.release();
    res
      .status(httpStatus.OK)
      .send({ message: "Product deleted successfully." });
  } catch (e) {
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
  remove,
};
