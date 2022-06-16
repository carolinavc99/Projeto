const Resource = require('../models/resource')

module.exports.insert = (r) => {
    let newResource = new Resource(r)
    return newResource.save()
}

module.exports.list = (filters) => {
    return Resource.find(filters).sort({dateUploaded: -1}).exec()
}

module.exports.list_recent = (n) => {
    let date = new Date()
    date.setDate(new Date().getDate() - 7)
    return Resource.find({timestamp: {$gte: date}}).sort({dateUploaded: -1}).limit(n).exec()
}

module.exports.list_top = (n) => {
    return Resource.aggregate([{$addFields: {'popularity': {$add: ["$views", "$downloads"]}}},{$sort: {'popularity': -1}},{$limit: n}]).exec()
}

module.exports.lookup = (rid) => {
    return Resource.findById(rid).exec()
}

module.exports.add_view = (rid) => {
    return Resource.findByIdAndUpdate(rid, {$inc: {views: 1}}).exec()
}

module.exports.add_download = (rid) => {
    return Resource.findByIdAndUpdate(rid, {$inc: {downloads: 1}}).exec()
}

module.exports.add_score = (rid, account, score) => {
    return Resource.findOne({_id: rid, 'reviews.author': account}).exec().then(value => {
        if(value) {
            return Resource.findOneAndUpdate({_id: rid, 'reviews.author': account}, {'reviews.$.value': score}).exec()
        } else {
            return Resource.findByIdAndUpdate(rid, {$push: {reviews: {'author': account, 'value': score}}}).exec()
        }
    })
}

module.exports.add_comment = (rid, comment) => {
    return Resource.findByIdAndUpdate(rid, {$push: {'comments': comment}}).exec()
}

module.exports.get_comment = (rid, cid) => {
    return Resource.findOne({_id: rid, 'comments._id': cid}, {'comments.$': 1}).exec()
}

module.exports.delete_comment = (rid, cid) => {
    return Resource.findByIdAndUpdate(rid, {$pull: {'comments': {_id: cid}}}).exec()
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