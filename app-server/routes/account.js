var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken')

const UserController = require('../controllers/userController')

router.get('/', function(req, res, next) {
  res.render('account')
});

router.post('/', function(req, res, next) {
  if(req.user.authLevel > 1 || req.body.id.toString() == req.user._id.toString()) {
    let id = req.body.id
    let data = req.body
    delete data.id
    UserController.update(id, data).then( value => {
      req.flash('success', "Dados atualizados com sucesso!")
      if(data.email && data.email != req.user.email) req.flash('info',"Por favor, volte a iniciar sessão.")
      res.redirect('back')
    }).catch( error => {
      next(error)
    })
  } else {
    res.status(403).render("Ppermissão insuficiente!")
  }
})

router.delete('/:id', function(req, res, next) {
  if(req.user.authLevel > 1 || req.params.id == req.user._id.toString()) {
    UserController.delete(req.params.id).then(v => {
      res.send("Conta eliminada com sucesso!")
    }).catch(e => {
      res.status(500).send(e)
    })
  } else {
    res.status(403).send("Permissão insuficiente!")
  }
})

router.post('/token', function(req, res, next) {
  let newToken = jwt.sign({"id": req.user._id.toString(), "auth": req.user.authLevel}, 'RPCW2022-Projeto')
  UserController.update_token(req.user._id, newToken).then(value => {
    req.flash('success', "Novo token gerado com sucesso!")
    res.redirect('back')
  }).catch(error => {
    req.flash('error', "Erro na geração de um novo token.")
    res.redirect('back')
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
