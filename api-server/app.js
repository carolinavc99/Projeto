var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const jwt = require('jsonwebtoken')
var fs = require('fs')

var apiRouter = require('./routes/api');

var app = express();

var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/RPCW2022-Projeto'
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true})

var db = mongoose.connection

db.on('error', () => console.log('Erro na conexão ao MongoDB...'))
db.once('open', () => console.log('Conexão ao MongoDB efetuada com sucesso...'))

app.use(logger('dev'));

app.use((req, res, next) => {
    let token = req.query.token
    if(token) {
      jwt.verify(token, 'RPCW2022-Projeto', (err, payload) => {
        if (err || !(payload.auth in [0,1,2])) return res.status(400).jsonp({error: "Token inválido"})
        res.locals.auth = payload.auth
        res.locals.id = payload.id
        next()
      })
    } else {
      res.status(401).jsonp({error: "Token não fornecido."})
    }
  })

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })

logger.token('id', function (req, res) { return res.locals.id })
logger.token('urlnotoken', function (req, res) { return req.url.replace(/[?&]?token=(?:[^&]|$)+/, '') })
logger.token('auth', function (req, res) { return res.locals.auth })

app.use(logger('[:date[iso]] {user: :id, auth: :auth} :method :urlnotoken :status :res[content-length]', { stream: accessLogStream }))

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

module.exports = app;
