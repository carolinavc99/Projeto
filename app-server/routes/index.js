var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.user)
    res.render('userIndex', {user: req.user})
  else
    res.render('index', {info: req.flash('info'), success: req.flash('success')});
});

router.use((req,res,next) => {
  if (req.user) {
    res.locals.user = req.user
    next()
  } 
  else res.redirect('/')
})

module.exports = router;
