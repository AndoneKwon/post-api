const mongoose = require('mongoose');
const {Schema} = mongoose;

const postSchema = new mongoose.Schema({
    title:{type: String, required:true},
    writer:{type: String, required:true},
    contents:{type: String, required:true},
    reply_num:{type: Number, required:true, default:0},
    likes_num:{type: Number, required:true, default:0},
    createdAt:{type: Date, default:Date.now},
});

module.exports = mongoose.model('post', postSchema);
