const mongoose = require('mongoose')

const ResourceSchema = new mongoose.Schema({
    title : String,
    dateCreated : Date,
    dateUploaded : Date,
    author : String, // nome do autor
    submittedBy : String, // email da conta que fez a submissão
    resourceType : String, // e.g.: teste/exame, slides, manual, relatório, tese, etc.
    files : [{
        name : String,
        path : String,
        size : Number,
        mimetype : String
    }]
})

module.exports = mongoose.model('Resource', ResourceSchema)