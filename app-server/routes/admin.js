const { default: axios } = require('axios');
var express = require('express');
var router = express.Router();

const UserController = require('../controllers/userController')
const NotificationController = require('../controllers/notificationController')

router.use((req, res, next) => {
    if(req.user.authLevel > 1) next()
    else res.render('error', {message: "Não tem permissão para aceder a esta página."})
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

router.get('/stats', function(req, res, next) {
    axios.get("http://localhost:8000/api/recursos/top" + '?token=' + req.user.token).then( value => {
        UserController.get_info(value.data.map(r => r.submittedBy)).then( userdata => {
            value.data.forEach((r, i) => {
                let user = userdata.find(x => x['_id'] == r.submittedBy)
                if(user) {
                    value.data[i]['submitter'] = user.username
                } else {
                    value.data[i]['submitter'] = "[DELETED]"
                }
            })
            axios.get("http://localhost:8000/api/log?n=50&token=" + req.user.token).then(v => {
                UserController.get_info(v.data.map(r => r.user)).then( userdata => {
                    v.data.forEach((d,i) => {
                        let user = userdata.find(x => x['_id'] == d.user)
                        v.data[i].user = user.username + " (" + user._id + ")"
                    })
                    res.render('admin/stats', {resources: value.data, log: v.data})
                })
            }).catch(error => {
                res.render('admin/stats', {resources: value.data, log: "Erro no pedido à API."})
            })
        }).catch( error => { res.render('error', {message: error}) })
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.get('/stats/log', function(req, res, next) {
    axios.get("http://localhost:8000/api/log" + '?token=' + req.user.token, {responseType: 'arraybuffer'}).then( value => {
        res.set(value.headers)
        res.send(value.data)
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.post('/notifications', function(req, res, next) {
    let newNotif = {
        ...req.body,
        'timestamp': new Date(),
        'author': req.user._id
    }
    NotificationController.insert(newNotif).then(v => {
        req.flash('success', "Notificação criada com sucesso!")
        res.redirect('back')
    }).catch(e => {
        req.flash('error', "Erro na criação da notificação")
        res.redirect('back')
    })
})

router.delete('/notifications/:nid', function(req, res, next) {
    NotificationController.delete(req.params.nid).then(v => {
        res.send('Notificação removida com sucesso!')
    }).catch(e => {
        res.status(500).send("Erro na remoção da notificação.")
    })
})

module.exports = router;
