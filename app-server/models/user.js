const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    email: String,
    username: String,
    authLevel: Number, // 0: utilizador normal; 1: produtor; 2: admin
    token: String // JWT token usado para autenticar o utilizador na API, criado no registo
})

UserSchema.plugin(passportLocalMongoose, {
    usernameField: "email"
});

module.exports = mongoose.model('user', UserSchema);