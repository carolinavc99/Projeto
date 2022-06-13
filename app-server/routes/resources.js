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
    let url = 'http://localhost:8000/api/recursos?'
    let query = []
    if(req.query.q) {
        query.push('q=' + req.query.q)
    }
    if(req.query.tipo) {
        query.push('tipo=' + req.query.tipo)
    }
    query.push('token=' + req.user.token)
    url += query.join('&')
    axios.get(url).then( value => {
        UserController.get_info(value.data.map(r => r.submittedBy)).then( userdata => {
            value.data.forEach((r, i) => {
                let user = userdata.find(x => x['_id'] == r.submittedBy)
                if(user) {
                    value.data[i]['submitter'] = user.username
                } else {
                    value.data[i]['submitter'] = "[DELETED]"
                }
            })
            res.render('resources', {resources: value.data, global: true, q: req.query.q, tipo: req.query.tipo})
        }).catch( error => { res.render('error', {message: error}) })
    }).catch(error => {
        res.render('error', {message: error})
    })
})

router.get('/user', function(req, res, next) {
    axios.get('http://localhost:8000/api/recursos?account=' + req.user._id + '&token=' + req.user.token).then( value => {
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

router.get('/:id/edit', (req, res, next) => {
    if(req.user.authLevel > 1 || req.user._id == value.data.submittedBy) {
        axios.get('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token).then(value => {
            res.render('editResource', {resource: value.data})
        }).catch(error => {
            res.render('error', {message: error})
        })
    } else
        res.render('error', {message: "Unauthorized"})
})

router.get('/:id/delete', (req, res, next) => {
    if(req.user.authLevel > 1 || req.user._id == value.data.submittedBy) {
        axios.delete('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token).then(value => {
            req.flash('success', 'Recurso removido com sucesso!')
            res.redirect('/resources/user')
        }).catch(error => {
            res.render('error', {message: error})
        })
    } else
        res.render('error', {message: "Unauthorized"})
})

router.get('/:id/download', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/zip?token=' + req.user.token, {responseType: 'arraybuffer'}).then(value => {
        res.set(value.headers)
        res.send(value.data)
    }).catch(error => {
        res.render('error', {message: error})
    })
})

router.get('/:id/:fid', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/' + req.params.fid + '?token=' + req.user.token).then(value => {
        if (value.data.mimetype == "text/xml") {
            axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/' + req.params.fid + '/file' + '?token=' + req.user.token).then(xmldata => {
                xml = xmldata.data
                xml = xml.replace(/<\/([\wí]+)>/g, (match, p1) => {
                    let a = "</" + ({
                        'lista': 'ul',
                        'listan': 'ol',
                        'item': 'li',
                        'para': 'p',
                        'documento': 'a',
                        'realce': 'b',
                        'título': 'h3',
                        'codigo': 'pre'
                    }[p1] || "div") + ">"
                    return a
                })
                xml = xml.replace(/<([\wí]+)(\s[^>]*)?>/g, (match, p1, p2) => {
                    if(p2)
                        p2 = p2.replace(/url=/g, "class=\"text-violet-200\" href=")
                    else
                        p2 = ""
                    let a = "<" + ({
                        'lista': 'ul class="list-disc pl-4"',
                        'listan': 'ol class="list-decimal pl-4"',
                        'item': 'li',
                        'para': 'p',
                        'documento': 'a',
                        'realce': 'b',
                        'recursos': 'h3 class="text-xl font-bold mt-4">Recursos</h3><div class="flex flex-col pl-4"',
                        'corpo': 'h2 class="text-2xl font-bold mt-6">Exercícios</h2><div class="pl-4"',
                        'enunciado': 'div class="pl-4 space-y-4"',
                        'título': 'h3 class="text-xl font-bold"',
                        'codigo': 'pre'
                    }[p1] || "div") + p2 + ">"
                    return a
                })
                xml = xml.replace(/<!\[CDATA\[|\]\]>/g, '')
                res.render('file', {file: value.data, xml: xml})
            }).catch(error => {
                res.render('error', {message: "File not Found"})
            })
        } else {
            res.render('file', {file: value.data})
        }
    }).catch(error => {
        res.render('error', {message: error})
    })
})

router.get('/:id/:fid/:filename', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/' + req.params.fid + '/file' + '?token=' + req.user.token, {responseType: 'arraybuffer'}).then(value => {
        res.set(value.headers)
        res.send(value.data)
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

    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISODate = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];

    sip['submissionDate'] = localISODate
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


router.post('/:id', upload.array('files'), function(req, res, next) {
    if(req.user.authLevel > 1 || req.user._id == value.data.submittedBy) {

        let zip = new JSZip()
        zip.file('bagit.txt', 'BagIt-Version: "1.0"\nTag-File-Character-Encoding: "UTF-8"')

        sip = {}
        sip['id'] = req.params.id
        sip['title'] = req.body.title
        sip['description'] = req.body.description
        sip['type'] = req.body.type
        sip['semester'] = parseInt(req.body.semester)
        sip['academicYearStart'] = parseInt(req.body.year)
        sip['submissionDate'] = new Date().toISOString().split('T')[0]
        sip['authors'] = req.body.authors.split(',').map(x => x.trim())
        sip['submitter'] = req.body.id
        sip['oldFiles'] = []
        for(var i = 0; i < req.body.nfiles; i++) {
            if (req.body['file' + i])
                sip['oldFiles'].push(req.body['file' + i])
        }
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
            axios.put('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token, formData, {headers: {'Content-Type': 'multipart/form-data'}}).then( value => {
                req.flash('success', 'Recurso editado com sucesso!')
            }).catch(error => { 
                req.flash('error', 'Erro no envio do pedido à API.')
            }).finally(() => {
                res.redirect('/resources/' + req.params.id)
            })
        })
    } else {
        res.render('error', {message: "Unauthorized"})
    }
})

module.exports = router;
