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

function producerOrAdmin(req, res, next) {
    if(req.user.authLevel > 0) next()
    else res.render('error', {message: "Não tem permissão para aceder a esta página."})
}

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
            res.render('resources/resources', {resources: value.data, global: true, q: req.query.q, tipo: req.query.tipo})
        }).catch( error => { res.render('error', {message: error}) })
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.get('/user/:uid', function(req, res, next) {
    axios.get('http://localhost:8000/api/recursos?account=' + req.params.uid + '&token=' + req.user.token).then( value => {
        UserController.get_info([req.params.uid]).then(userdata => {
            res.render('resources/resources', {resources: value.data, global: false, userpage: userdata.length > 0 ? userdata[0].username : "[DELETED]"})
        })
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.get('/new', producerOrAdmin, function(req, res, next) {
    res.render('resources/newResource', {user: req.user})
});

router.get('/:id', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token).then(value => {
        let reviews = value.data.reviews
        let score = 0
        let userScore = 0
        if (reviews.length > 0)
            score = (reviews.reduce((acc, x) => acc + x.value, 0) / reviews.length).toFixed(2)
        let userS = reviews.find(x => x.author == req.user._id)
        if(userS) userScore = userS.value
        value.data.comments.sort((a,b) => b.timestamp.localeCompare(a.timestamp))
        UserController.get_info([value.data.submittedBy].concat(value.data.comments.map(x => x.author))).then( userdata => {
            let author = userdata.find(x => x['_id'] == value.data.submittedBy)
            value.data.submitter = author ? author.username : "[DELETED]"
            value.data.submitterEmail = author ? author.email : ""
            value.data.comments.forEach((c,i) => {
                let user = userdata.find(x => x['_id'] == c.author)
                value.data.comments[i].authorUsername = user ? user.username : "[DELETED]"
                value.data.comments[i].authorEmail = user ? user.email : ""
            })
            res.render('resources/resource', {resource: value.data, score: score, userScore: userScore})
        })
    }).catch(error => {
        res.render('error', {error: error.response, message: error.response.data.error})
    })
})

router.get('/:id/edit', (req, res, next) => {
    if(req.user.authLevel > 1 || req.user._id.toString() == value.data.submittedBy.toString()) {
        axios.get('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token).then(value => {
            res.render('resources/editResource', {resource: value.data})
        }).catch(error => {
            res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
        })
    } else
        res.render('error', {message: "Unauthorized"})
})

router.get('/:id/delete', (req, res, next) => {
    if(req.user.authLevel > 1 || req.user._id.toString() == value.data.submittedBy.toString()) {
        axios.delete('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token).then(value => {
            req.flash('success', 'Recurso removido com sucesso!')
            res.redirect('/resources/user')
        }).catch(error => {
            res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
        })
    } else
        res.render('error', {message: "Unauthorized"})
})

router.post('/:id/score', (req, res, next) => {
    let userScore = req.body.value
    axios.post('http://localhost:8000/api/recursos/' + req.params.id + '/score?token=' + req.user.token, {account: req.user._id, score: userScore}).then(value => {
        res.send("Score set successfully.")
    }).catch(error => {
        res.status(500).send(error.response !== undefined ? error.response.data.error : error)
    })
})

router.post('/:id/comment', (req, res, next) => {
    axios.post('http://localhost:8000/api/recursos/' + req.params.id + '/comment?token=' + req.user.token, {author: req.user._id, text: req.body.comment, timestamp: Date.now()}).then(value => {
        req.flash('success', 'Comentário submetido com sucesso!')
        res.redirect("back")
    }).catch(error => {
        res.status(500).send(error.response !== undefined ? error.response.data.error : error)
    })
})

router.delete('/:id/comment/:cid', (req, res, next) => {
    if(req.user.authLevel > 1 || req.user._id.toString() == value.data.submittedBy.toString()) {
        axios.delete('http://localhost:8000/api/recursos/' + req.params.id + '/comment/' + req.params.cid + '?token=' + req.user.token).then(value => {
            res.send("Comentário eliminado com sucesso!")
        }).catch(error => {
            res.status(500).send(error.response !== undefined ? error.response.data.error : error)
        })
    } else
        res.render('error', {message: "Unauthorized"})
})

router.get('/:id/download', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/zip?token=' + req.user.token, {responseType: 'arraybuffer'}).then(value => {
        res.set(value.headers)
        res.send(value.data)
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.get('/:id/:fid', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/' + req.params.fid + '?token=' + req.user.token).then(value => {
        if (value.data.mimetype.endsWith("/xml")) {
            axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/' + req.params.fid + '/file' + '?token=' + req.user.token).then(xmldata => {
                xml = xmldata.data
                xml = xml.replace(/<\/([\wí]+)>/g, (match, p1) => {
                    let a = "</" + ({
                        'lista': 'ul',
                        'listan': 'ol',
                        'alíneas': 'ol',
                        'alínea': 'li',
                        'item': 'li',
                        'para': 'p',
                        'documento': 'a',
                        'realce': 'b',
                        'título': 'h3',
                        'codigo': 'pre',
                        'disciplina': 'h2',
                        'data': 'p'
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
                        'título': 'h3 class="text-xl font-bold mt-3"',
                        'codigo': 'pre',
                        'disciplina': 'h2 class="text-2xl font-bold"',
                        'data': 'p class="font-light text-sm"',
                        'objectivos': 'div class="mt-6"',
                        'alíneas': 'ol class="list-[lower-alpha] pl-4"',
                        'alínea': 'li'
                    }[p1] || "div") + p2 + ">"
                    return a
                })
                xml = xml.replace(/<!\[CDATA\[|\]\]>/g, '')
                res.render('resources/file', {file: value.data, xml: xml})
            }).catch(error => {
                res.render('error', {message: "File not Found"})
            })
        } else {
            res.render('resources/file', {file: value.data})
        }
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.get('/:id/:fid/:filename', (req, res, next) => {
    axios.get('http://localhost:8000/api/recursos/' + req.params.id + '/' + req.params.fid + '/file' + '?token=' + req.user.token, {responseType: 'arraybuffer'}).then(value => {
        res.set(value.headers)
        res.send(value.data)
    }).catch(error => {
        res.render('error', {message: error.response !== undefined ? error.response.data.error : error})
    })
})

router.post('/', producerOrAdmin, upload.array('files'), function(req, res, next) {
    let zip = new JSZip()
    zip.file('bagit.txt', 'BagIt-Version: "1.0"\nTag-File-Character-Encoding: "UTF-8"')

    sip = {}
    sip['title'] = req.body.title
    sip['description'] = req.body.description
    sip['type'] = req.body.type
    sip['semester'] = parseInt(req.body.semester)
    sip['academicYearStart'] = parseInt(req.body.year)
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

    zip.generateAsync({type:'nodebuffer', streamFiles: true}).then(file => {
        var formData = new FormData()
        formData.append('file', file, "data.zip")
        axios.post('http://localhost:8000/api/recursos?token=' + req.user.token, formData, {headers: {'Content-Type': 'multipart/form-data'}, maxBodyLength: Infinity}).then( value => {
            req.flash('success', 'Recurso adicionado com sucesso!')
        }).catch(error => { 
            req.flash('error', 'Erro no envio do pedido à API: ' + error)
        }).finally(() => {
            res.redirect('/resources/new')
        })
    })
})


router.post('/:id', upload.array('files'), function(req, res, next) {
    if(req.user.authLevel > 1 || req.user._id.toString() == value.data.submittedBy.toString()) {

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
            axios.put('http://localhost:8000/api/recursos/' + req.params.id + '?token=' + req.user.token, formData, {headers: {'Content-Type': 'multipart/form-data'}, maxBodyLength: Infinity}).then( value => {
                req.flash('success', 'Recurso editado com sucesso!')
            }).catch(error => { 
                req.flash('error', 'Erro no envio do pedido à API: ' + error.response !== undefined ? error.response.data.error : error)
            }).finally(() => {
                res.redirect('/resources/' + req.params.id)
            })
        })
    } else {
        res.render('error', {message: "Unauthorized"})
    }
})

module.exports = router;
