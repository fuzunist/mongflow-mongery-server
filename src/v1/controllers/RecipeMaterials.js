const {
  getAll,
  updateEach,
  insert,
  getAllLogs,
  updateEachLog,
  insertLog,
  checkExistingMaterial,
  updateEachStock,
  updateEachStockInProduction
} = require("../services/RecipeMaterials");
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
  // const { item_id, date, price, quantity, last_edited_by, supplier, waybill } =
  //   req.body;

  try {
    insertLog(req.body)
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
