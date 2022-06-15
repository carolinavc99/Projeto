var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken')
var User = require('../models/user')
var mongoose = require('mongoose')

var passport = require('passport')

router.get('/register', function(req, res) {
    res.render('register');
});
  
// handling user sign up
router.post("/register", function(req, res, next){
    if (req.body.password == req.body['password_confirm']) {
        let authLevel = 0
        let id = new mongoose.Types.ObjectId();
        let token = jwt.sign({"id": id.toString(),"auth": authLevel}, 'RPCW2022-Projeto')
        User.register(new User({
            _id: id,
            username: req.body.username,
            email: req.body.email,
            authLevel: authLevel,
            token: token
            }), req.body.password, function(err, user){
            if(err){
                if (err.message == "A user with the given username is already registered") {
                    req.flash('error', "Endereço de email já em uso por outro utilizador.")
                }
                else {
                    req.flash('error', err.message)
                }
                res.redirect('back')
            }
            else {
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/");
                });
            }
        });
    } else {
        req.flash('error', "Palavras-passe não correspondem!")
        res.redirect('back')
    }
});

router.get("/login", function(req, res){
    res.render('login');
});

router.post("/login", passport.authenticate("local",{
    failureRedirect: "/login", failureFlash: true
    }), function(req, res){
        res.redirect('/')
});

router.get("/logout", function(req, res){
    req.logout(function(err) {
        if(err) return next(err)
        res.redirect("/");
    });
});

module.exports = router