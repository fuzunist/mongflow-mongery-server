const httpStatus = require("http-status/lib");
const {
  insert,
  insertProductionRecipe,
  getAll,
  del,
  update,
  getOne,
  insertSpecialRecipe,
  getAllSpecialRecipes,
  delSpecialRecipe,
  getAllProductionRecipes
} = require("../services/Recipes");

const create = async (req, res) => {
  console.log("recipe to create:", req.body);
  try {
    insert(req.body)
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

const createProductionRecipe = async (req, res) => {
  console.log("production recipe to create:", req.body);
  try {
    insertProductionRecipe(req.body)
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
const get = (req, res) => {
  getAll()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

const getProductionRecipes = (req, res) => {
  getAllProductionRecipes()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

const put = async (req, res) => {
  const id = req.params?.id;

  try {
    update({ ...req.body, id })
      .then(({ rows }) => res.status(httpStatus.OK).send(rows[0]))
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

const remove = async (req, res) => {};

const createSpecialRecipe = async (req, res) => {
  try {
    insertSpecialRecipe(req.body)
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

const getSpecialRecipes = (req, res) => {
  getAllSpecialRecipes()
    .then(({ rows }) => res.status(httpStatus.OK).send(rows))
    .catch((e) =>
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({ error: e })
    );
};

const removeSpecialRecipe = async (req, res) => {
  const id = req.params.id;
  delSpecialRecipe(id)
    .then(({ rowCount }) => {
      if (!rowCount)
        return res
          .status(httpStatus.NOT_FOUND)
          .send({ message: "There is no such record." });
      res.status(httpStatus.OK).send({ message: "User deleted successfully." });
    })
    .catch(() =>
      res
        .status(httpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: "An error occurred." })
    );
};

module.exports = {
  create,
  get,
  put,
  remove,
  getSpecialRecipes,
  createSpecialRecipe,
  removeSpecialRecipe,
  createProductionRecipe,
  getProductionRecipes
};
