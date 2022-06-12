const Resource = require('../models/resource')

module.exports.insert = (r) => {
    let newResource = new Resource(r)
    return newResource.save()
}

module.exports.list = (filters) => {
    return Resource.find(filters).exec()
}

module.exports.lookup = (rid) => {
    return Resource.findById(rid).exec()
}

module.exports.delete = (rid) => {
    return Resource.findByIdAndDelete(rid).exec()
}

module.exports.lookup_file = (rid, fid) => {
    return Resource.findOne({'_id': rid, 'files._id' : fid},{'files.$': 1}).exec()
}

module.exports.edit = (id, d) => {
    return Resource.findByIdAndUpdate(id, d).exec()
}

module.exports.edit_files = (id, old_files, new_files) => {
    return Promise.all([Resource.aggregate([{$unwind: '$files'},{$match: {'files._id': {$in: old_files}}},{$project: {"files.path": 1}}]).exec(), Resource.findByIdAndUpdate(id, {$pull: {files: {_id: {$in: old_files}}}}).exec(), Resource.findByIdAndUpdate(id, {$push: {files: {$each: new_files}}}).exec()])
}