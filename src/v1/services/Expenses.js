const _getExpenses = (date) => {
  return process.pool.query(
    "SELECT id, TO_CHAR(date, 'MM/YYYY') AS date, saved_expenses, monthly_expenses, daily_expenses, hourly_expenses, monthly_cost, daily_cost, hourly_cost FROM companyexpenses WHERE date=$1",
    [date]
  );
};

const _getClasses = () => {
  return process.pool.query("SELECT * FROM companyexpensesclass");
};

const _getItems = () => {
  return process.pool.query(
    "SELECT * FROM companyexpensesitems ORDER BY id ASC"
  );
};

const _createItem = (data) => {
  return process.pool.query(
    'INSERT INTO "companyexpensesitems" (class_id, name, frequency) VALUES ($1, $2, $3) RETURNING *',
    [data.class_id, data.name, data.frequency]
  );
};

const checkExistingItem = async (name) => {
  const query = "SELECT * FROM companyexpensesitems WHERE name = $1";
  const result = await process.pool.query(query, [name]);

  return result.rows.length > 0;
};

// BURASI EXTRA CRON JOB İLE HER AY TETİKLENECEK
const _createExpense = (data) => {
  return process.pool.query(
    'INSERT INTO "companyexpenses" (date,saved_expenses, monthly_expenses, daily_expenses, hourly_expenses) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [
      data.date,
      data.saved_expenses,
      data.monthly_expenses,
      data.daily_expenses,
      data.hourly_expenses,
    ]
  );
};

const _updateExpense = (data) => {
  return process.pool.query(
    "UPDATE companyexpenses SET monthly_expenses=$1, daily_expenses=$2, hourly_expenses=$3, monthly_cost=$4, daily_cost=$5, hourly_cost=$6, saved_expenses=$7  WHERE id=$8 RETURNING *",
    [
      data.monthly_expenses,
      data.daily_expenses,
      data.hourly_expenses,
      data.monthly_cost,
      data.daily_cost,
      data.hourly_cost,
      data.saved_expenses,
      data.id,
    ]
  );
};

const _updateExpenseItemFrequency = (data) => {
  return process.pool.query(
    "UPDATE companyexpensesitems SET frequency=$1 WHERE id=$2 RETURNING *",
    [data.frequency, data.id]
  );
};
module.exports = {
  _getExpenses,
  _getClasses,
  _getItems,
  _createItem,
  _createExpense,
  _updateExpense,
  checkExistingItem,
  _updateExpenseItemFrequency,
};
