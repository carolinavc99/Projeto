var express = require('express');
var router = express.Router();

const UserController = require('../controllers/userController')
const NotificationController = require('../controllers/notificationController')

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.user) {
    NotificationController.list_recent().then(v => {
      UserController.get_info(v.map(x => x.author)).then(userdata => {
        v.forEach(notif => {
          let author = userdata.find(x => x['_id'] == notif.author)
          notif.authorUsername = author ? author.username : "[DELETED]"
        })
        res.render('userIndex', {user: req.user, notifications: v})
      }).catch(e => {
        res.status(500).render('error', {error: {status: 500}, message: "Erro na comunicação com a base de dados."})
      })
    }).catch(e => {
      res.status(500).render('error', {error: {status: 500}, message: "Impossível obter lista de notificações."})
    })
  }
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

router.get('/notifications', function(req, res, next) {
  NotificationController.list().then(v => {
    UserController.get_info(v.map(x => x.author)).then(userdata => {
      v.forEach(notif => {
        let author = userdata.find(x => x['_id'] == notif.author)
        notif.authorUsername = author ? author.username : "[DELETED]"
      })
      res.render('notifications', {notifications: v})
    }).catch(e => {
      res.status(500).render('error', {error: {status: 500}, message: "Erro na comunicação com a base de dados."})
    })
  }).catch(e => {
    res.status(500).render('error', {error: {status: 500}, message: "Impossível obter lista de notificações."})
  })
})

module.exports = router;
