var express = require('express');
var router = express.Router();

const jwt = require('jsonwebtoken')
const JSZip = require('jszip')
const crypto = require('crypto')

const fs = require('fs')

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const ResourceController = require('../controllers/resourceController')

router.use((req, res, next) => {
  let token = req.query.token || req.header('token')
  if(token) {
    jwt.verify(token, 'RPCW2022-Projeto', (err, payload) => {
      if (err || !payload.auth) return res.status(400).jsonp({error: "Token inválido"})
      res.locals.auth = payload.auth
      next()
    })
  } else {
    res.status(401).jsonp({error: "Token não encontrado."})
  }
})

router.get('/recursos', function(req, res, next) {
  ResourceController.list().then(value => {
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.get('/recursos/:rid', function(req, res, next) {
  ResourceController.lookup(req.params.rid).then(value => {
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.post('/recursos', upload.single('file'), function(req, res, next) {
  fs.readFile(req.file.path, function(err, data) {
    if (err) throw err
    JSZip.loadAsync(data).then(zip => {
      zip.file('RRD-SIP.json').async('string').then(data => {
        const sip = JSON.parse(data)
      
        const submitter = sip['submitter']
        const type = sip['type']
        const path = 'data/' + submitter + '/' + type
  
        if(!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true })
        }
  
        let promises = []

        sip.files.forEach(file => {
          promises.push(zip.file(file.path).async('nodebuffer'))
          file['path'] = path + '/' + file.name
        })

        Promise.all(promises).then(values => {
          values.forEach((fileData, i) => {
            let hash = crypto.createHash('sha512').update(fileData, 'utf8').digest('hex')
            if (hash === sip.files[i].hash) {
              fs.writeFile(path + '/' + sip.files[i].name, fileData, err => { if (err) throw err })
            } else {
              return res.status(500).jsonp({error: "File hashes do not match!"})
            }
          })

          fs.unlink(req.file.path, (err) => {
            if (err) throw err
          })
          
          ResourceController.insert({
            'title': sip['title'],
            'semester': sip['semester'],
            'academicYearStart': sip['academicYearStart'],
            'dateUploaded': sip['submissionDate'],
            'description': sip['description'],
            'authors': sip['authors'],
            'submittedBy': sip['submitter'],
            'resourceType': sip['type'],
            'files': sip.files,
            'comments': [],
            'views': 0
          }).then(value => {
            res.jsonp(value)
          }).catch(error => {
            res.status(502).jsonp({error: error})
          })
        }).catch(error => res.status(504).jsonp({error: error}))
      }).catch(error => res.status(503).jsonp({error: error}))
    }).catch(error => res.status(501).jsonp({error : error}))
  })
});

module.exports = router;
