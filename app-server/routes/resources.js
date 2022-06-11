var express = require('express');
var router = express.Router();
const axios = require('axios').default
const FormData = require('form-data')

const JSZip = require('jszip')
const crypto = require('crypto')

const fs = require('fs')

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const UserController = require('../controllers/userController')

router.use((req, res, next) => {
    if(req.user.authLevel > 0) next()
    else res.render('error', {message: "unauthorized"})
})

router.get('/', function(req, res, next) {
    axios.get('http://localhost:8000/api/recursos?token=' + req.user.token).then( value => {
        UserController.get_info(value.data.map(r => r.submittedBy)).then( userdata => {
            value.data.forEach((r, i) => {
                let user = userdata.find(x => x['_id'] == r.submittedBy)
                if(user) {
                    value.data[i]['submitter'] = user.username
                } else {
                    value.data[i]['submitter'] = "[DELETED]"
                }
            })
            res.render('resources', {resources: value.data, global: true})
        }).catch( error => { res.render('error', {message: error}) })
    }).catch(error => {
        res.render('error', {message: error})
    })
})

router.get('/user', function(req, res, next) {
    axios.get('http://localhost:8000/api/recursos?token=' + req.user.token).then( value => {
        res.render('resources', {resources: value.data, global: false})
    }).catch(error => {
        res.render('error', {message: error})
    })
})

router.get('/new', function(req, res, next) {
    res.render('newResource', {user: req.user})
});

router.get('/:id', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token).then(value => {
        UserController.get_info([value.data.submittedBy]).then( userdata => {
            value.data.submitter = userdata[0].username
            value.data.submitterEmail = userdata[0].email
            res.render('resource', {resource: value.data})
        })
    }).catch(error => {
        res.render('error', {message: error})
    })
})

router.post('/', upload.array('files'), function(req, res, next) {
    let zip = new JSZip()
    zip.file('bagit.txt', 'BagIt-Version: "1.0"\nTag-File-Character-Encoding: "UTF-8"')

    sip = {}
    sip['title'] = req.body.title
    sip['description'] = req.body.description
    sip['type'] = req.body.type
    sip['semester'] = parseInt(req.body.semester)
    sip['academicYearStart'] = parseInt(req.body.year)
    sip['submissionDate'] = new Date().toISOString().split('T')[0]
    sip['authors'] = req.body.authors.split(',').map(x => x.trim())
    sip['submitter'] = req.body.id
    sip['files'] = []

    manifest = ""

    req.files.forEach(f => {
        let data = fs.readFileSync(f.path)
        let path = 'data/' + f.originalname
        let hash = crypto.createHash('sha512').update(data, 'utf8').digest('hex')
        sip['files'].push({
            'name': f.originalname,
            'path': path,
            'size': f.size,
            'mimetype': f.mimetype,
            'hash': hash
        })
        manifest += `${hash} ${path}\n`
        zip.file(path, data)
        fs.unlink(f.path, (err) => {
            if (err) throw err
        })
    })


    zip.file('manifest-sha512.txt', manifest)
    zip.file('RRD-SIP.json', JSON.stringify(sip, null, 4))

    // zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
    //     .pipe(fs.createWriteStream('temp/data.zip'))
    //     .on('finish', function() {
    //         console.log("Ficheiro ZIP gerado com sucesso!")
    //     })

    zip.generateAsync({type:'nodebuffer', streamFiles: true}).then(file => {
        var formData = new FormData()
        formData.append('file', file, "data.zip")
        axios.post('http://localhost:8000/api/recursos?token=' + req.user.token, formData, {headers: {'Content-Type': 'multipart/form-data'}}).then( value => {
            req.flash('success', 'Recurso adicionado com sucesso!')
        }).catch(error => { 
            req.flash('error', 'Erro no envio do pedido à API.')
        }).finally(() => {
            res.redirect('/resources/new')
        })
    })
})

module.exports = router;
