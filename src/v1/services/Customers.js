const insert = (data) => {
  return process.pool.query(
    'INSERT INTO "customer" (userid, companyname, email, phone, address, website, products, contacts ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [
      data.userid,
      data.companyname,
      data.email,
      data.phone,
      data.address,
      data.website,
      data.products,
      data.contacts
    ]
  );
};

const getAll = () => {
  return process.pool.query('SELECT * FROM "customer" ORDER BY customerid ASC');
};

const getOne = (customerid) => {
  return process.pool.query('SELECT * FROM "customer" WHERE customerid = $1', [
    customerid,
  ]);
};

const update = (data) => {
  return process.pool.query(
    'UPDATE "customer" SET companyname = $1, email = $2, phone = $3, address = $4, website=$5, contacts=$6, products=$7 WHERE customerid = $8 RETURNING *',
    [
      data.companyname,
      data.email,
      data.phone,
      data.address,
      data.website,
      data.contacts,
      data.products,
      data.customerid,
    ]
  );
}; 

const del = (id) => {
  return process.pool.query('DELETE FROM "customer" WHERE customerid = $1', [
    id,
  ]);
};

module.exports = {
  insert,
  getAll,
  getOne,
  update,
  del,
};
