const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    author: String,
    title: String,
    content: String,
    timestamp: Date
})

module.exports = mongoose.model('notification', NotificationSchema)