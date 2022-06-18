var express = require('express');
var router = express.Router();
var axios = require('axios').default

const UserController = require('../controllers/userController')
const NotificationController = require('../controllers/notificationController')

/* GET home page. */
router.get('/', function(req, res, next) {
  if (req.user) {
    NotificationController.list_recent().then(notifData => {
      axios.get('http://localhost:8000/api/recursos?recent=3&token=' + req.user.token).then( value => {
        UserController.get_info(notifData.map(x => x.author).concat(value.data.map(x => x.submittedBy))).then(userdata => {
          notifData.forEach(notif => {
            let author = userdata.find(x => x['_id'] == notif.author)
            notif.authorUsername = author ? author.username : "[DELETED]"
          })
          value.data.forEach(resource => {
            let author = userdata.find(x => x['_id'] == resource.submittedBy)
            resource.submitter = author ? author.username : "[DELETED]"
          })
          res.render('userIndex', {user: req.user, notifications: notifData, resources: value.data})
        }).catch(e => {
          res.status(500).render('error', {error: {status: 500}, message: "Erro na comunicação com a base de dados."})
        })
      }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
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
