const User = require('../models/user')
const mongoose = require('mongoose')

module.exports.update = (id, data) => {
    return User.findByIdAndUpdate(new mongoose.Types.ObjectId(id), data).exec()
}

module.exports.list = () => {
    return User.find({},{email: 1, username: 1, authLevel: 1}).exec()
}

module.exports.get_user = (email) => {
    return User.findByUsername(email)
}

module.exports.get_info = (ids) => {
    return User.find({_id: {$in: ids}}, {email: 1, username: 1})
}

module.exports.update_token = (id, newToken) => {
    return User.findByIdAndUpdate(id, {'token': newToken}).exec()
}

module.exports.delete = (id) => {
    return User.findByIdAndDelete(id).exec()
}