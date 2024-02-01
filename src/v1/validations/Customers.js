const Joi = require('joi/lib')

const createValidation = Joi.object({
    companyname: Joi.string().required().min(3),
    // email: Joi.string().email(),
    // phone: Joi.string(),
    // address: Joi.string(),
    // website: Joi.string().allow("", null),
    // products: Joi.array(),
    // contacts: Joi.array()
    
})

module.exports = {
    createValidation
}
