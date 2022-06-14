const mongoose = require('mongoose')

const ResourceSchema = new mongoose.Schema({
    title : String,
    description : String,
    semester : Number, // 1, 2 ou 0 se for anual
    academicYearStart : Number, // 2021 no caso do ano letivo 2021/22
    dateUploaded : Date,
    authors : [String], 
    submittedBy : String, // id da pessoa que fez a submissão
    resourceType : String, // e.g.: teste/exame, slides, manual, relatório, tese, etc.
    files : [{
        name : String,
        path : String,
        size : Number,
        mimetype : String,
        hash : String
    }],
    comments : [{
        author : String, // id da pessoa que comentou
        text : String,
        timestamp: Date
    }],
    reviews : [{
        _id: false,
        author : String,
        value : Number
    }],
    views : Number,
    downloads : Number
})

module.exports = mongoose.model('Resource', ResourceSchema)