const Resource = require('../models/resource')

module.exports.insert = (r) => {
    let newResource = new Resource(r)
    return newResource.save()
}

module.exports.list = () => {
    return Resource.find().exec()
}

module.exports.lookup = (rid) => {
    return Resource.findById(rid).exec()
}