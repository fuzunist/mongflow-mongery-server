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

const insertContact = (data) => {
  return process.pool.query(
    `INSERT INTO "dailycontacts" (userid, customerid, companyname, person, contacttype, date, time, result)
     VALUES( $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.userid,
      data.customerid,
      data.companyname,
      data.person,
      data.contacttype,
      data.date,
      data.time,
      data.result,
    ]
  );
};



const getAll = () => {
  return process.pool.query('SELECT * FROM "customer" ORDER BY customerid ASC');
};

const getDateRangeContacts = (data) => {
   console.log("data", data)
  return process.pool.query(
    'SELECT * FROM "dailycontacts" WHERE date BETWEEN $1 AND $2 ORDER BY date ASC',
    [data.startDate, data.endDate]
  );
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

const updateContact = (data) => {
  return process.pool.query(
    `UPDATE "dailycontacts" 
     SET customerid=$2, person = $3, contacttype = $4, date = $5,time = $6,result = $7, companyname=$8 WHERE id = $1 RETURNING *`,
    [
      data.id,
      data.customerid,
      data.person,
      data.contacttype,
      data.date,
      data.time,
      data.result,
      data.companyname
    ]
  );
};


const del = (id) => {
  return process.pool.query('DELETE FROM "customer" WHERE customerid = $1', [
    id,
  ]);
};

const delContact = (id) => {
  return process.pool.query('DELETE FROM "dailycontacts" WHERE id = $1', [
    id,
  ]);
};
module.exports = {
  insert,
  getAll,
  getOne,
  update,
  del,
  insertContact,
  getDateRangeContacts,
  updateContact,
  delContact
};
