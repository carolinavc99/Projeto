// Roteador do servidor API para o problema da gestão de tarefas
var express = require('express');
var router = express.Router();
const Tarefa = require('../controllers/tarefa')

function verificalNivel(autorizados,req,res,next) {
  if (req.level in autorizados) {
    next()
  } else{
    res.status(403).jsonp({error: "Não tem nível de acesso suficiente"})
  }
}

// Listar todas as tarefas
router.get('/tarefas', function(req, res) {
  Tarefa.listar()
    .then(dados => res.status(200).jsonp(dados) )
    .catch(e => res.status(500).jsonp({error: e}))
});

// Número de tarefas na BD
router.get('/tarefas/numero', function(req, res) {
  Tarefa.listar()
    .then(dados => res.status(200).jsonp(dados.length) )
    .catch(e => res.status(500).jsonp({error: e}))
});

// Consultar uma tarefa
router.get('/tarefas/:id', function(req, res) {
  Tarefa.consultar(req.params.id)
    .then(dados => res.status(200).jsonp(dados))
    .catch(e => res.status(500).jsonp({error: e}))
});

// Inserir uma tarefa
router.post('/tarefas', function(req, res){
  Tarefa.inserir(req.body)
    .then(dados => res.status(201).jsonp({dados: dados}))
    .catch(e => res.status(500).jsonp({error: e}))
})

// Alterar uma tarefa
router.put('/tarefas', function(req, res){
  Tarefa.alterar(req.body)
    .then(dados => res.status(201).jsonp({dados: dados}))
    .catch(e => res.status(500).jsonp({error: e}))
})

// Remover uma tarefa
router.delete('/tarefas/:id', function(req, res,next) {
  if (req.level == 'admin') {
    next()
  } else{
    res.status(403).jsonp({error: "Não tem nível de acesso suficiente"})
  }}, 
  function (req,res) {
    Tarefa.remover(req.params.id)
      .then(dados => res.status(200).jsonp(dados))
      .catch(e => res.status(500).jsonp({error: e}))
})


module.exports = router;
