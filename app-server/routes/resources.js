var express = require('express');
var router = express.Router();

const JSZip = require('jszip')
const crypto = require('crypto')

const fs = require('fs')

const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })

router.use((req, res, next) => {
    if(req.user.authLevel > 0) next()
    else res.render('error', {message: "unauthorized"})
})

router.get('/new', function(req, res, next) {
    res.render('newResource', {user: req.user})
});

router.post('/', upload.array('files'), function(req, res, next) {
    let zip = new JSZip()
    zip.file('bagit.txt', 'BagIt-Version: "1.0"\nTag-File-Character-Encoding: "UTF-8"')

    sip = {}
    sip['title'] = req.body.title
    sip['description'] = req.body.description
    sip['type'] = req.body.type
    sip['semester'] = req.body.semester
    sip['academicYearStart'] = req.body.year
    sip['submissionDate'] = new Date().toISOString().split('T')[0]
    sip['authors'] = req.body.authors.split(',').map(x => x.trim())
    sip['submitter'] = req.body.username
    sip['submitterEmail'] = req.body.email
    sip['files'] = []
    
    hashes = {}

    req.files.forEach(f => {
        let data = fs.readFileSync(f.path)
        let path = 'data/' + f.originalname
        let hash = crypto.createHash('sha512').update(data, 'utf8').digest('hex')
        hashes[hash] = path
        sip['files'].push({
            'name': f.originalname,
            'size': f.size,
            'mimetype': f.mimetype
        })
        zip.file(path, data)
        fs.unlink(f.path, (err) => {
            if (err) throw err
        })
    })

    manifest = ""
    for(const [key, value] of Object.entries(hashes)) {
        manifest += `${key} ${value}\n`
    }

    zip.file('manifest-sha512.txt', manifest)
    zip.file('RRD-SIP.json', JSON.stringify(sip, null, 4))

    zip.generateNodeStream({type:'nodebuffer',streamFiles:true})
        .pipe(fs.createWriteStream('temp/data.zip'))
        .on('finish', function() {
            console.log("Ficheiro ZIP gerado com sucesso!")
        })

    req.flash('success', 'Recurso adicionado com sucesso!')
    res.redirect('/resources/new')
})

module.exports = router;
