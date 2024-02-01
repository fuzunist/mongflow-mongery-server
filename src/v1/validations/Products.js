const Joi = require('joi/lib')

const createValidation = Joi.object({
    productName: Joi.string().required().min(3),
    defaultPrice: Joi.number().required(),
    defaultCurrency: Joi.string().required(),
    attributes: Joi.array().required(),
    type: Joi.number().required()
})

const updateValidation = Joi.object({
    productName: Joi.string().required().min(3),
    defaultPrice: Joi.number().required(),
    defaultCurrency: Joi.string().required(),
    attributes: Joi.array().required()
})

module.exports = {
    createValidation,
    updateValidation
}
