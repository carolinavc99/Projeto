var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var jwt = require('jsonwebtoken')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

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
var LocalStrategy = require('passport-local')
app.use(require("express-session")({
    secret:"RPCW2022-Projeto",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const User = require('./models/user')
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/register', function(req, res) {
  res.render('register');
});

// handling user sign up
app.post("/register", function(req, res){
  let authLevel = parseInt(req.body.authLevel)
  let token = jwt.sign({"auth": authLevel}, 'RPCW2022-Projeto')
  User.register(new User({
    username: req.body.username,
    email: req.body.email,
    authLevel: authLevel,
    token: token
    }), req.body.password, function(err, user){
      if(err){
        console.log(err);
        return res.render("register");
      }
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
  });
});

app.get("/login", function(req, res){
  res.render('login', {message: req.session.messages ? req.session.messages.at(-1) : ""});
});

app.post("/login", passport.authenticate("local",{
  failureRedirect: "/login", failureMessage: true
}), function(req, res){
  res.redirect('/')
});

app.get("/logout", function(req, res){
  req.logout(function(err) {
    if(err) return next(err)
    res.redirect("/");
  });
});


app.use('/', indexRouter);
app.use('/users', usersRouter);

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
