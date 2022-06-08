var express = require('express');
var router = express.Router();

router.use((req, res, next) => {
    if(req.user.authLevel > 1) next()
    else res.render('error', {message: "unauthorized"})
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('adminPanel', {user: req.user})
});

module.exports = router;
