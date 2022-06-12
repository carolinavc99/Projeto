var express = require('express');
var router = express.Router();
var path = require('path')

const jwt = require('jsonwebtoken')
const JSZip = require('jszip')
const crypto = require('crypto')

const fs = require('fs')

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const ResourceController = require('../controllers/resourceController');
const { default: mongoose } = require('mongoose');

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
  filters = {}
  if(req.query.account) {
    filters['submittedBy'] = req.query.account
  }
  if(req.query.q) {
    filters['title'] = {"$regex": req.query.q, "$options": "i"}
  }
  if(req.query.tipo) {
    filters['resourceType'] = req.query.tipo
  }
  ResourceController.list(filters).then(value => {
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

router.delete('/recursos/:rid', function(req, res, next) {
  ResourceController.delete(req.params.rid).then(value => {
    value.files.forEach(v => {
      fs.unlink(v.path, (err) => {
        if (err) throw err
      })
    })
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.get('/recursos/:rid/:fid', function(req, res, next) {
  ResourceController.lookup_file(req.params.rid, req.params.fid).then(value => {
    let filedata = {
      'name': value.files[0].name,
      'size': value.files[0].size,
      'mimetype': value.files[0].mimetype,
      '_id': value.files[0]._id,
    }
    res.jsonp(filedata)
  }).catch(error => {
    console.log(error)
    res.status(500).jsonp({error: error})
  })
});

router.get('/recursos/:rid/:fid/file', function(req, res, next) {
  ResourceController.lookup_file(req.params.rid, req.params.fid).then(value => {
    let filepath = path.resolve(__dirname + '/../' + value.files[0].path)
    res.sendFile(filepath)
  }).catch(error => {
    console.log(error)
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


router.put('/recursos/:rid', upload.single('file'), function(req, res, next) {
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
          
          ResourceController.edit_files(sip['id'], sip['oldFiles'].map(x => new mongoose.Types.ObjectId(x)), sip.files).then(value => {
            value[0].forEach(v => {
              fs.unlink(v.files.path, (err) => {
                if (err) throw err
              })
            })
            ResourceController.edit(sip['id'], {
              'title': sip['title'],
              'semester': sip['semester'],
              'academicYearStart': sip['academicYearStart'],
              'description': sip['description'],
              'authors': sip['authors'],
              'resourceType': sip['type'],
            }).then(value => {
              res.jsonp(value)
            }).catch(error => {
              res.status(502).jsonp({error: error})
            })
          }).catch(error => {
            res.status(505).jsonp({error: error})
          })
        }).catch(error => res.status(504).jsonp({error: error}))
      }).catch(error => res.status(503).jsonp({error: error}))
    }).catch(error => res.status(501).jsonp({error : error}))
  })
});

module.exports = router;
