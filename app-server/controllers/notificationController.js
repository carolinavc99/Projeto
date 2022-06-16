const Notification = require('../models/notification')
const mongoose = require('mongoose')


module.exports.list = () => {
    return Notification.find().sort({timestamp: -1}).exec()
}

module.exports.list_recent = () => {
    let date = new Date()
    date.setDate(new Date().getDate() - 7)
    return Notification.find({timestamp: {$gte: date}}).sort({timestamp: -1}).limit(5).exec()
}

module.exports.insert = (notif) => {
    let newNotif = new Notification(notif)
    return newNotif.save()
}

module.exports.delete = (nid) => {
    return Notification.findByIdAndDelete(nid).exec()
}