var jwt = require('jsonwebtoken')
var mongoose = require('mongoose');
var mongoDB = 'mongodb://127.0.0.1/RPCW2022-Projeto'
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true})

var db = mongoose.connection

db.on('error', () => console.log('Erro na conexão ao MongoDB...'))
db.once('open', () => console.log('Conexão ao MongoDB efetuada com sucesso...'))

var passport = require('passport')

const User = require('./models/user')
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

let authLevel = 2
let id = new mongoose.Types.ObjectId();
let token = jwt.sign({"id": id.toString(),"auth": authLevel}, 'RPCW2022-Projeto')
User.register(new User({
    _id: id,
    username: "admin",
    email: "admin",
    authLevel: authLevel,
    token: token
    }), "admin", function(err, user){
      if(err) console.log(err)
      db.close()
  });