const { default: axios } = require('axios');
var express = require('express');
var router = express.Router();

const UserController = require('../controllers/userController')

router.use((req, res, next) => {
    if(req.user.authLevel > 1) next()
    else res.render('error', {message: "unauthorized"})
})

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('admin/panel')
});

router.get('/users', function(req, res, next) {
    UserController.list().then(value => {
        res.render('admin/users', {users: value})
    }).catch(error => {
        res.status(500).render('error', {message: error})
    })
})

module.exports = router;
