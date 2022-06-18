var express = require('express');
var router = express.Router();
var path = require('path')
const libxmljs = require('libxmljs2')

const JSZip = require('jszip')
const crypto = require('crypto')

const fs = require('fs')

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

const ResourceController = require('../controllers/resourceController');
const { default: mongoose } = require('mongoose');

function validXML(xml) {
  var data = fs.readFileSync( path.resolve(__dirname + '/../data/aulaP.xsd'), "utf8")
  var xsdDoc = libxmljs.parseXml(data)
  var xmlDoc = libxmljs.parseXml(xml)
  var valid = xmlDoc.validate(xsdDoc)
  if (!valid)
    console.log(xmlDoc.validationErrors)
  return valid
}

function adminOrOwner(req, res, next) {
  if(res.locals.auth > 1) next()
  else if(req.params.rid) {
    ResourceController.lookup(req.params.rid).then(v => {
      if (v.submittedBy == res.locals.id)
        next()
      else 
        res.status(403).jsonp({error: "Sem permissão."})
    }).catch(e => {
      res.status(500).jsonp({error: e})
    })
  } else {
    next()
  }
}

router.get('/log', function(req, res, next) {
  if(res.locals.auth > 1) {
    if(req.query.n) {
      let lines = fs.readFileSync(path.resolve(__dirname + '/../access.log')).toString().split(/\r?\n/).reverse()
      let log = []
      for(let i = 0; i < Math.min(parseInt(req.query.n), lines.length); i++) {
        if(lines[i].length == 0) continue
        let m = /\[(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})[^{]+{user: ([^,]+)[^}]+} (\w+ .*)\s+\d+\s*$/.exec(lines[i])
        log.push({
          'date': m[1],
          'time': m[2],
          'user': m[3],
          'request': m[4]
        })
      }
      res.jsonp(log)
    }
    else {
      res.sendFile(path.resolve(__dirname + '/../access.log'))
    }
  } else {
    res.status(403).jsonp({error: "Sem permissão."})
  }
})

router.get('/recursos', function(req, res, next) {
  if(req.query.recent) {
    ResourceController.list_recent(parseInt(req.query.recent)).then(value => {
      res.jsonp(value)
    }).catch(error => {
      res.status(500).jsonp({error: error})
    })
  } else {
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
  }
});

router.get('/recursos/top', function(req, res, next) {
  let n = req.query.n || 20
  ResourceController.list_top(n).then(value => {
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.get('/recursos/:rid', function(req, res, next) {
  ResourceController.lookup(req.params.rid).then(value => {
    ResourceController.add_view(req.params.rid)
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: "Recurso não encontrado."})
  })
});

router.delete('/recursos/:rid', adminOrOwner, function(req, res, next) {
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

router.get('/recursos/:rid/zip', function(req, res, next) {
  ResourceController.lookup(req.params.rid).then(value => {
    var zip = new JSZip()
    value.files.forEach(f => {
      let filedata = fs.readFileSync(path.resolve(__dirname + '/../' + f.path))
      zip.file(f.name, filedata)
    })

    ResourceController.add_download(req.params.rid)

    zip.generateAsync({type:'nodebuffer', streamFiles: true}).then(file => {
      res.set('Content-Type', 'application/zip')
      res.set('Content-disposition', 'attachment; filename=' + value.title.toLowerCase().split(' ').join('_') + '.zip');
      res.send(file)
    }).catch(error => {
      res.status(501).jsonp({error: error})
    })

  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.post('/recursos/:rid/score', function(req, res, next) {
  ResourceController.add_score(req.params.rid, req.body.account, req.body.score).then(value => {
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.post('/recursos/:rid/comment', function(req, res, next) {
  let newComment = {
    author: req.body.author,
    text: req.body.text,
    timestamp: req.body.timestamp
  }
  ResourceController.add_comment(req.params.rid, newComment).then(value => {
    res.jsonp(value)
  }).catch(error => {
    res.status(500).jsonp({error: error})
  })
});

router.delete('/recursos/:rid/comment/:cid', function(req, res, next) {
  if(res.locals.auth > 1) {
    ResourceController.delete_comment(req.params.rid, req.params.cid).then(value => {
      res.jsonp(value)
    }).catch(error => {
      res.status(500).jsonp({error: error})
    })
  } else {
    ResourceController.get_comment(req.params.rid, req.params.cid).then(value => {
      if(value.comments.author == res.locals.id) {
        ResourceController.delete_comment(req.params.rid, req.params.cid).then(value => {
          res.jsonp(value)
        }).catch(error => {
          res.status(500).jsonp({error: error})
        })
      }
      else
        res.status(403).jsonp({error: "Sem permissão."})
    })
  }
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
              if(!(sip.files[i].mimetype.endsWith("/xml")) || validXML(fileData.toString())) {
                fs.writeFile(path + '/' + sip.files[i].name, fileData, err => { if (err) throw err })
              } else {
                throw new Error("Invalid XML file!")
              }
            } else {
              throw new Error("File hashes do not match!")
            }
          })

          fs.unlink(req.file.path, (err) => {
            if (err) throw err
          })
          
          ResourceController.insert({
            'title': sip['title'],
            'semester': sip['semester'],
            'academicYearStart': sip['academicYearStart'],
            'dateUploaded': new Date(),
            'description': sip['description'],
            'authors': sip['authors'],
            'submittedBy': sip['submitter'],
            'resourceType': sip['type'],
            'files': sip.files,
            'comments': [],
            'reviews': [],
            'views': 0,
            'downloads': 0
          }).then(value => {
            res.jsonp(value)
          }).catch(error => {
            res.status(502).jsonp({error: error})
          })
        }).catch(error => {
          fs.unlink(req.file.path, (err) => {
            if (err) throw err
          })
          res.status(504).jsonp({error: error.message})
        })
      }).catch(error => {
        fs.unlink(req.file.path, (err) => {
          if (err) throw err
        })
        res.status(503).jsonp({error: error.message})
      })
    }).catch(error => {
      fs.unlink(req.file.path, (err) => {
        if (err) throw err
      })
      res.status(501).jsonp({error : error.message})
    })
  })
});


router.put('/recursos/:rid', adminOrOwner, upload.single('file'), function(req, res, next) {
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
              if(!(sip.files[i].mimetype.endsWith("/xml")) || validXML(fileData.toString())) {
                fs.writeFile(path + '/' + sip.files[i].name, fileData, err => { if (err) throw err })
              } else {
                throw new Error("Invalid XML file!")
              }
            } else {
              throw new Error("File hashes do not match!")
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
