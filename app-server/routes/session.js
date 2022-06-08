var express = require('express');
var router = express.Router();

var passport = require('passport')

router.get('/register', function(req, res) {
    res.render('register');
});
  
// handling user sign up
router.post("/register", function(req, res){
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

router.get("/login", function(req, res){
    res.render('login', {error : req.flash('error')});
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