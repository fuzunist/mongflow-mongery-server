const bcrypt = require('bcrypt')
const JWT = require('jsonwebtoken')

const passwordToHash = async (password) => {
    return await bcrypt.hash(password, 10)
}

const passwordHashCompare = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword)
}

const generateAccessToken = (user) => {
    return JWT.sign({ name: user.userid, ...user }, process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: '1w' })
}

const generateRefreshToken = (user) => {
    return JWT.sign({ name: user.userid, ...user }, process.env.REFRESH_TOKEN_SECRET_KEY)
}

const dateToIsoFormatWithTimezoneOffset = (date) => {
    date.setTime(date.getTime() - date.getTimezoneOffset() * 60000)
    return date.toISOString().split('T')[0]
}

const delInArray = (arr, item) => {
    const index = arr.indexOf(item)
    if (index !== -1) {
        arr.splice(index, 1)
    }

    return arr
}

const missingNumber = (arr) => {
    let _missingNumber = null
    for (let i = 10; i <= arr[arr.length - 1]; i++) {
        if (!arr.includes(i)) {
            _missingNumber = i
            break
        }
    }
    return _missingNumber
}

module.exports = {
    passwordToHash,
    passwordHashCompare,
    generateAccessToken,
    generateRefreshToken,
    dateToIsoFormatWithTimezoneOffset,
    delInArray,
    missingNumber
}
