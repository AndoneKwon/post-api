var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var postRouter = require('./routes/post')

var app = express();
app.set('view engine', 'ejs');


var db = mongoose.connection;
db.on('error', console.error);
db.once('open',function(){
    console.log('Connect Success');
})

mongoose.connect('mongodb://localhost:27017/Post');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/post', postRouter);


module.exports = app;
