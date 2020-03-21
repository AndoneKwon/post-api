const mongoose = require('mongoose');
const {Schema} = mongoose;
var connection = mongoose.createConnection('mongodb://localhost:27017/Post');
const autoIncrement = require('mongoose-auto-increment');

autoIncrement.initialize(connection);

function getCurrentDate(){
    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth();
    var today = date.getDate();
    collection_name=year.toString()+month.toString()+today.toString();
    return collection_name;
}

const postSchema = new mongoose.Schema({
    id:{type: Number, required:true, unique:true, index:true},
    title:{type: String, required:true},
    writer:{type: String, required:true},
    contents:{type: String, required:true},
    reply_num:{type: Number, required:true, default:0},
    likes_num:{type: Number, required:true, default:0},
    createdAt:{type: Date, default:Date.now},
    lati:{type: Number, default:null},
    long:{type: Number ,default:null},
    userId:{type: Number,required:true},
    unixTime:{type:Number,required:true}
},
{
    collection:'posts',
    timestamp:true
});

postSchema.plugin(autoIncrement.plugin,{
    model:'Post',
    field:'id',
    startAt:9971,
    increment:1
})

module.exports = mongoose.model('Post', postSchema);
