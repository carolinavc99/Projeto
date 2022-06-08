var express = require('express');
var router = express.Router();

const UserController = require('../controllers/userController')

router.use(function(req, res, next) {
  if(req.user) next()
  else return res.redirect('/')
})

router.get('/', function(req, res, next) {
  let success = req.flash('success')
  let error = req.flash('error')
  res.render('account', { user : req.user, success: success, error: error })
});

router.post('/', function(req, res, next) {
  let id = req.body.id
  let data = req.body
  delete data.id
  UserController.update(id, data).then( value => {
    req.flash('success', "Dados atualizados com sucesso!")
    if(data.email != req.user.email) req.flash('info',"Por favor, volte a iniciar sessão.")
    res.redirect('back')
  }).catch( error => {
    next(error)
  })
})

router.post('/password', function(req, res, next) {
  console.log(req.body.password)
  console.log(req.body['password_confirm'])
  if (req.body.password == req.body['password_confirm']) {
    UserController.get_user(req.user.email).then(function(sanitizedUser){
      if (sanitizedUser){
          sanitizedUser.setPassword(req.body.password, function(){
              sanitizedUser.save();
              req.flash('success', "Palavra-passe atualizada com sucesso!")
              res.redirect('back')
          });
      } else {
        res.status(500).send("<p>Unexpected error!</p>")
      }
    }).catch(error => next(error))
  } else {
    req.flash('error', "Erro - palavras-passe não correspondem.")
    res.redirect('back')
  }
})

module.exports = router;
