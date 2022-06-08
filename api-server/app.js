var express = require('express');
// var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var apiRouter = require('./routes/api');

var app = express();

var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/RPCW2022-Projeto'
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true})

var db = mongoose.connection

db.on('error', () => console.log('Erro na conexão ao MongoDB...'))
db.once('open', () => console.log('Conexão ao MongoDB efetuada com sucesso...'))

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

module.exports = app;
