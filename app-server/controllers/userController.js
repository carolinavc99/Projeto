const User = require('../models/user')
const mongoose = require('mongoose')

module.exports.update = (id, data) => {
    return User.findByIdAndUpdate(new mongoose.Types.ObjectId(id), data).exec()
}

module.exports.get_user = (email) => {
    return User.findByUsername(email)
}