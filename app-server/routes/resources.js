var express = require('express');
var router = express.Router();
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

router.use((req, res, next) => {
    if(req.user.authLevel > 0) next()
    else res.render('error', {message: "unauthorized"})
})

router.get('/new', function(req, res, next) {
    res.render('newResource', {user: req.user})
});

router.post('/', upload.array('files'), function(req, res, next) {
    console.log(req.files)
    console.log(req.body)
    res.redirect('/resources/new')
})

module.exports = router;
