var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var flash = require('express-flash')
var jwt = require('jsonwebtoken')

var sessionRouter = require('./routes/session');
var indexRouter = require('./routes/index');
var accountRouter = require('./routes/account');
var resourcesRouter = require('./routes/resources');
var adminRouter = require('./routes/admin')

var app = express();

var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/RPCW2022-Projeto'
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true})

var db = mongoose.connection

db.on('error', () => console.log('Erro na conexão ao MongoDB...'))
db.once('open', () => console.log('Conexão ao MongoDB efetuada com sucesso...'))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var passport = require('passport')
app.use(require("express-session")({
    secret:"RPCW2022-Projeto",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user')
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.error = req.flash('error')
  res.locals.warning = req.flash('warning')
  res.locals.info = req.flash('info')
  res.locals.success = req.flash('success')
  res.locals.typePrettier = (type) => {
    return {
      'slides': "Slides",
      'ficha': "Ficha",
      'teste-exame': "Teste/Exame",
      'tese': "Tese",
      'projeto': "Projeto",
      'manual': "Manual",
      'relatorio': "Relatório",
      'outro': 'Outro'
    }[type] || type
  }
  next()
})

app.use('/', sessionRouter);
app.use('/', indexRouter);
app.use('/account', accountRouter);
app.use('/resources', resourcesRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
