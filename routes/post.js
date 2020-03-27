var express = require('express');
var router = express.Router();
var Post = require('../schema/post'); //
var nJwt = require('njwt');
var path = require('path');
var {Follow} = require('../models');
var {User}=require('../models');
var {Likes}=require('../models');
var {Reply}=require('../models');
var tokenValues;
var dotenv = require('dotenv').config();
const client = require('../cache_redis');
const tempPost = require('../cache_redis3');//myPost와 userpost불러올 때 임시캐시서버
const axios = require('axios');
var {promisify} = require('util');
const getRedis = promisify(client.get).bind(client);
const getTempRedis = promisify(tempPost.get).bind(tempPost);
const setTempRedis = promisify(tempPost.set).bind(tempPost);
const multer = require('multer');

var checkOver = function (newYear,newMonth,newToday){
  if (newMonth < 10 && newToday < 10) {
    return checkDate = newYear.toString() + '0' + newMonth.toString() + '0' + newToday.toString();
  } else if (newMonth < 10 && newToday >= 10) {
    return checkDate = newYear.toString() + '0' + newMonth.toString() + newToday.toString();
  } else if (newMonth >= 10 && newToday < 10) {
    return checkDate = newYear.toString() + newMonth.toString() + '0' + newToday.toString();
  } else {
    return checkDate = newYear.toString() + newMonth.toString() + newToday.toString();
  }
}

var isEmpty = function (value) {
  if (value == "" || value == null || value == undefined || (value != null && typeof value == "object" && !Object.keys(value).length)) {
    return true
  } else {
    return false
  }
};

var checkLike = async function(myId,posts){
  let isLikeList=[];
  let LikeObject={};
  let objectId;
  let isLike;
  for(var i=0;i<Object.keys(posts).length;i++){
    objectId=posts[i]._id;
    await Likes.findOne({
      where:{
        liker:myId,
        object_Id:objectId.toString()
      },
    })
    .then(result=>{
      //console.log(result[0].object_Id);
      if(isEmpty(result)){
        isLike=0;
      }else{
        isLike=1;
      }
      LikeObject[objectId]=isLike;
    });
  }
  //console.log(LikeObject);
  return LikeObject;
}

function getCurrentDate(){
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var today = date.getDate();
  var time = date.getTime();
  collection_name=year.toString()+month.toString()+today.toString()+time.toString();
  return collection_name;
};//오늘 날짜 체크

function Unix_timeStampConv(){
  return Math.floor(new Date().getTime()/1000);
}

var isEmpty = function(value){ 
  if( value == "" || value == null || value == undefined || ( value != null && typeof value == "object" && !Object.keys(value).length ) ){ 
    return true 
  }else{ 
    return false 
  } 
};

const storage = multer.diskStorage({
  destination: "public/statics/",
  filename: function(req, file, cb) {
     cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits:{ fileSize: 10000000 },
}).single("file");

// Posts - create ; insert -> insert_ok
router.post('/create', async function(req, res){
  try{
    client.get("lastPostIndex",async function(err,result){
      try{
        var id=Number(result)+1;
        client.set("lastPostIndex",id);
        var createValue=Number(getCurrentDate());
        tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');

        const postValue = new Post();

        upload(req, res, async (err) => {
          if (err) {
            return console.log(err);
          }

          if (req.file) {
            postValue.title=req.body.title;
            postValue.writer=tokenValues.body.nickname;
            postValue.contents=req.body.content;
            postValue.uid=tokenValues.body.id;
            postValue.id=id;
            postValue.lati=req.body.lati;
            postValue.long=req.body.long;
            postValue.userId=tokenValues.body.id;
            postValue.unixTime=Unix_timeStampConv();
            postValue.file = req.file.filename;
            
            await postValue.save(async function(err, postvalue){
              if(err) return console.log(err);

              await Follow.findAll({
                where:{
                  followingId:tokenValues.body.id
                },
                attributes:['followerId']
              })
              .then(result=>{
                return console.log(typeof result);
              })
            });
            
            
            
            //Save MyPost for json to redis server
            var myPosts = Post.findAll({where : {userId : id}});
            var parse_posts = JSON.parse(myPosts);
            client.set("_posts_"+id, parse_posts, 60*60*3);

            return res.status(200).send("post create");
          } else {
            postValue.title=req.body.title;
            postValue.writer=tokenValues.body.nickname;
            postValue.contents=req.body.content;
            postValue.uid=tokenValues.body.id;
            postValue.id=id;
            postValue.lati=req.body.lati;
            postValue.long=req.body.long;
            postValue.userId=tokenValues.body.id;
            postValue.unixTime=Unix_timeStampConv();
            
            await postValue.save(async function(err, postvalue){
              if(err) return console.log(err);
              await Follow.findAll({
                where:{
                  followingId:tokenValues.body.id
                },
                attributes:['followerId']
              })
              .then(result=>{
                return console.log(typeof result);
              })
            });
            
            
            //Save MyPost for json to redis server
            var myPosts = Post.findAll({where : {userId : id}});
            var parse_posts = JSON.parse(myPosts);
            client.set("_posts_"+id, parse_posts, 60*60*3);
            
            return res.status(200).send("post create");
          }
        });
      }
      catch(err){
        console.log(err);
      }
    });
  } catch (err){
    console.log("err임");
    console.log(err);
    res.status(500).send(err);
  }
});
// Posts - read ; 원하는 정보만 표시~ findOne 메소드

router.post('/getMyPost', async function(req,res){
  const tokenvalue = nJwt.verify(req.headers.authorization, 'nodebird', 'HS256');
  const myNickName = tokenvalue.body.nickname;
  const myId = tokenvalue.body.id; // req.decoded.id
  var currentDateId;
  var todayId;
  var postlist;
  var postlist;
  var indexDate, lastIndexDate;
  var newDate, newYear, newMonth, newToday, newPostDate;
  const minimumDate = 20200129;
  var checkDate;
  var onePageValue=10;
  var finddate = 6;
  console.log("first test:"+req.body.date);
  console.log(req.body.year,req.body.month,req.body.date);
  var myPostKey='myPost'+myId;//redis에 저장된 나의 key
  if(req.body.isLastMyPost==1){
    res.json({
      code:200,
      message:"마지막 게시물입니다."
    });
  }

  if(req.body.year==null){
    tempPost.del(myPostKey);
    console.log('redis reset success');
  };
  tempPost.get(myPostKey, async function (err, result) {
    var data = {};
    if(result==null){
      console.log('first');
    }else{  
      newYear=req.body.year;
      newMonth=req.body.month;
      newToday=req.body.date;//사용자에게서 온 Date를 설정
      postlist = JSON.parse(result);
    }
    do { 
      /* 완전한 첫번째 요청 */
      if (req.body.year == null && isEmpty(data) && postlist == null) {
        console.log("first req");
        var dateNow = new Date();
        let dateToday = new Date();
        let nowToday = dateNow.getDate();
        dateToday.setDate(nowToday);
        dateNow.setDate(nowToday - finddate);
        let todayDate = dateToday.getFullYear().toString()+dateToday.getMonth().toString()+dateToday.getDate().toString();
        newYear = dateNow.getFullYear();
        newMonth = dateNow.getMonth();
        newToday = dateNow.getDate();
        indexDate = newYear.toString() + newMonth.toString() + newToday.toString();
        checkDate = checkOver(newYear,newMonth,newToday);
        if (Number(checkDate) <= minimumDate) {
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          console.log("첫번째 피드요청인데 첫날까지 돌아감");
          indexDate = minimumDate;
          let tempdata={};
          let Posts=[];
          await Post.find({
            userId: myId,
            id: { '$gt': 0 }
          })
          .then(async result => {
            Posts=result;
          });
          let isLikeList=await checkLike(myId,Posts);
            //console.log(isLikeList);
          data.Post = Posts;
          data.isLiked=isLikeList;
          data.Year = 2020;
          data.Month = 1;
          data.Date = 29;
          data.isLastMyPost = 1;
          client.del(myPostKey);
          res.json(data);
          break;
        }else{
          console.log("첫번째 find");
          console.log(indexDate);
          let tempdata={};
          let Posts=[];
          await Post.findOne({ date: indexDate })
          .then(result => {
            console.log("first find Index");
            currentDateId = result.id;
          });
          await Post.findOne({ date: todayDate })
          .then(result => {
            console.log("first find Index");
            todayId = result.id;
            console.log(todayDate,todayId);
          });
          await Post.find({
            userId: myId,
            id: { '$gt': currentDateId }
          })
          .then(async result => {
            Posts=result;
          });
          console.log("처음 찾은 게시물 : "+Object.keys(Posts).length);
          console.log(newYear,newMonth,newToday);
          var isLikeList=await checkLike(myId,Posts);
          data.Post = Posts;//Post List
          data.isLiked=isLikeList;
          data.Year = newYear;
          data.Month = newMonth;
          data.Date = newToday;
          data.isLastMyPost = 0;
          postlist=data;
          //console.log(Object.keys(data.Post).length,Object.keys(data.isLiked).length);
          console.log("first find Post");
          console.log("first update Success");
          //console.log(data);
          await setTempRedis(myPostKey, JSON.stringify(data));
        }
      } else if (req.body.year != null && (postlist==null||postlist.Post==null||Object.keys(postlist.Post).length < onePageValue)) {
        //2번째 요청부터 redis에 저장된 게시물이 30개 이하일때, redis에 저장한 게시물 없을때
        //console.log('redis에 저장된 게시물 개수 : '+Object.keys(postlist.Post).length);
        var lastDate = newYear.toString() + newMonth.toString() + newToday.toString();
        newDate = new Date(newYear, newMonth, newToday-7);
        newYear = newDate.getFullYear();
        newMonth = newDate.getMonth();
        newToday = newDate.getDate();
        newPostDate = newYear.toString() + newMonth.toString() + newToday.toString();
        console.log(lastDate,newPostDate);
        checkDate=checkOver(newYear,newMonth,newToday);

        await Post.findOne({ date: lastDate })
        .then(resultDate => {
          lastDateId = resultDate.id;
        });

        if (Number(checkDate) <= minimumDate) {
          console.log('재 피드요청 but 30개 못넘고 마지막날까지 탐색');
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          indexDate = minimumDate;
          let tempdata={};
          let Posts=[];
          let getlast=await getTempRedis(myPostKey);
          //console.log(getlast)
          let lastdata = JSON.parse(getlast);
          await Post.find({
            userId: myId,
            'id': { '$gt':0, '$lt':lastDateId}
          })
          .then(async result => {
            //console.log(result)
            Posts=result;
          })
          .catch(err=>{
            console.log(err);
          });
          let isLikeList=await checkLike(myId,Posts);
          //console.log(isLikeList);
          for(var i=0;i<Object.keys(Posts).length;i++){
            let getPostId=Posts[i]._id;
            lastdata.Post.push(Posts[i]);
            lastdata.isLiked[getPostId]=isLikeList[getPostId];
          }
          //console.log(lastdata);
          lastdata.Year=2020;
          lastdata.Month=1;
          lastdata.Date=29;
          lastdata.isLastMyPost = 1;
          //client.set(myId, JSON.stringify(lastdata));
          tempPost.del(myPostKey);
          res.json(lastdata);
          break;
        } else {
          console.log("재 피드요청 but not over 30");
          indexDate=newPostDate;
          let getlast=await getTempRedis(myPostKey);
          let lastdata = JSON.parse(getlast);
          await Post.findOne({ 
            date: indexDate 
          })
          .then(result => {
            currentDateId = result.id;
          });
          var data={};
          var Posts=[];
          await Post.find({
            userId: myId,
            id: { '$gt': currentDateId, '$lt': lastDateId }
          })
          .then(async result4 => {
            Posts=result4;
          });
          
          let isLikeList=await checkLike(myId,Posts);
          console.log("추가할 게시물:"+Object.keys(Posts).length);
          for(var i=0;i<Object.keys(Posts).length;i++){
            let getPostId=Posts[i]._id;
            lastdata.Post.push(Posts[i]);
            lastdata.isLiked[getPostId]=isLikeList[getPostId];
          }
          console.log("재피드 요청 개수 :"+Object.keys(lastdata.Post).length)
          lastdata.Year=newYear;
          lastdata.Month=newMonth;
          lastdata.Date=newToday;
          lastdata.isLastMyPost=0;
          postlist=lastdata;
          await setTempRedis(myPostKey,JSON.stringify(lastdata));
        }
      } else if (req.body.year == null && (postlist==null||postlist.Post==null||Object.keys(postlist.Post).length < onePageValue)) {
        //첫번째 요청에서 30개가 되지 않았을때
        console.log('첫번째 요청 but not over 30');
        let lastdata;
        var lastDate = newYear.toString() + newMonth.toString() + newToday.toString();//이전에 저장된 date
        var lastDateId;
        console.log(newYear, newMonth, newToday,lastDate);
        var dateNow = new Date(newYear, newMonth, newToday - finddate);
        newYear = dateNow.getFullYear();
        newMonth = dateNow.getMonth();
        newToday = dateNow.getDate();
        indexDate = newYear.toString() + newMonth.toString() + newToday.toString();

        checkDate=checkOver(newYear,newMonth,newToday);//날짜 자리수

        console.log("indexDate"+indexDate);
        if (Number(checkDate) <= minimumDate) {
          console.log('첫번째 요청인데 30개가 안되는데 가다보니 첫번째 날일때');
          //서비스를 시작한 첫번째 날보다 전 날짜 나올때
          indexDate = minimumDate;
          let tempdata={};
          let Posts=[];
          await Post.findOne({ date: lastDate })
          .then(result => {
            //console.log(result)
            lastDateId = result.id;
          });
          
          await Post.find({
            userId: myId,
            id: { '$gt': 0, '$lt': lastDateId }
          })
          .then(result2=>{
            Posts=result2;
          }
          );

          var beforeData = await getTempRedis(myPostKey);
          lastdata = JSON.parse(beforeData);
          let isLikeList=await checkLike(myId,Posts);
          for(var i=0;i<Object.keys(Posts).length;i++){
            let getPostId=Posts[i]._id;
            lastdata.Post.push(Posts[i]);
            lastdata.isLiked[getPostId]=isLikeList[getPostId];
          }
          lastdata.Year = 2020;
          lastdata.Month = 1;
          lastdata.Date = 29;
          lastdata.isLastMyPost = 1;
          await setTempRedis(myPostKey, JSON.stringify(lastdata));
          res.json(lastdata);
          break;
        } else {
          console.log('첫번째 요청인데 30개가 안될때');
          let lastDateId;
          await Post.findOne({ 
            date: lastDate 
          })
          .then(result=>{
            lastDateId=result.id;
          });
          var Posts=[];
          await Post.findOne({ 
            date: indexDate 
          })
          .then(async result => {
            currentDateId = result.id;//7일전 날짜
            await Post.find({
              userId: myId,
              id: { '$gt': currentDateId, '$lt': lastDateId }
            })
            .then(result => {
              Posts=result;
            });
            
            var getLastData=await getTempRedis(myPostKey);
              //console.log(getLastData);
            lastdata = JSON.parse(getLastData);
            let isLikeList=await checkLike(myId,Posts);
            if(lastdata.Post!=undefined){
              for(var i=0;i<Object.keys(Posts).length;i++){
                let getPostId=Posts[i]._id;
                lastdata.Post.push(Posts[i]);
                lastdata.isLiked[getPostId]=isLikeList[getPostId];
              }
            } 
            lastdata.Year=newYear;
            lastdata.Month=newMonth;
            lastdata.Date=newToday;
            lastdata.isLastMyPost=0;
            postlist=lastdata;
            await setTempRedis(myPostKey,JSON.stringify(lastdata));
            console.log('redis 설정 완료'+Object.keys(lastdata).length)
          });
        }//30개 이하로 redis에 저장될때 조건 끝
      }else if(req.body.year!=null&&Object.keys(postlist.Post).length>=onePageValue){//30개 이상 redis에 있을때
        console.log("재 피드요청 over 30");
        let lastdata;
        let Post=[];
        let Likes={};
        let sendData={};//front로 보내주는애들
        let updateData={};//front에 보낸 게시물을 제외한 나머지 애들을 다시 redis로
        let afterPost=[];
        let afterLike={};
        tempPost.get(myPostKey,async function(err,result){
          lastdata=JSON.parse(result);
          for(let i=0;i<onePageValue;i++){
            let getPostId=lastdata.Post[i]._id;
            Post.push(lastdata.Post[i]);
            Likes[getPostId]=lastdata.isLiked[getPostId];
          }
          for(let i=0;i<Object.keys(lastdata.Post).length;i++){
            let getPostId=lastdata.Post[i]._id;
            afterPost.push(lastdata.Post[i]);
            afterLike[getPostId]=lastdata.isLiked[getPostId];
          }
          
          for(let i=0;i<onePageValue;i++){
            let getPostId=lastdata.Post[i]._id;
            delete afterLike[getPostId];
          }//이미 띄운 피드 삭제
          afterPost.splice(0,onePageValue);
          sendData.Post=Post;
          sendData.isLiked=Likes;
          sendData.Year=lastdata.Year;
          sendData.Month=lastdata.Month;
          sendData.Date=lastdata.Date;
          sendData.isLastMyPost=0;
          updateData.Post=afterPost;
          updateData.isLiked=afterLike;
          updateData.Year=lastdata.Year;
          updateData.Month=lastdata.Month;
          updateData.Date=lastdata.Date;
          updateData.isLastMyPost=0;
          postlist=updateData;
          await setTempRedis(myPostKey,JSON.stringify(updateData));
          res.json(sendData);
        });
        break;
      }else if(req.body.year==null&&Object.keys(postlist.Post).length>=onePageValue){
        console.log("첫 피드 요청 over 30");
        let lastdata;
        let sendData={};
        let updateData={};
        let Post=[];
        let Likes={};
        let afterPost=[];
        let afterLike={};
        tempPost.get(myPostKey,async function(err,result){
          lastdata=JSON.parse(result);
          for(let i=0;i<onePageValue;i++){
            let getPostId=lastdata.Post[i]._id;
            Post.push(lastdata.Post[i]);
            Likes[getPostId]=lastdata.isLiked[getPostId];
          }
          //console.log(Likes);
          for(let i=0;i<Object.keys(lastdata.Post).length;i++){
            let getPostId=lastdata.Post[i]._id;
            afterPost.push(lastdata.Post[i]);
            afterLike[getPostId]=lastdata.isLiked[getPostId];
          }
          for(let i=0;i<onePageValue;i++){
            let getPostId=lastdata.Post[i]._id;
            delete afterLike[getPostId];
          }//이미 보낸 LikeList삭제
          afterPost.splice(0,onePageValue);//이미 보낸 Post삭제
          sendData.Post=Post;
          sendData.isLiked=Likes;
          sendData.Year=lastdata.Year;
          sendData.Month=lastdata.Month;
          sendData.Date=lastdata.Date;
          sendData.isLastMyPost=0;
          updateData.Post=afterPost;
          updateData.isLiked=afterLike;
          updateData.Year=lastdata.Year;
          updateData.Month=lastdata.Month;
          updateData.Date=lastdata.Date;
          updateData.isLastMyPost=0;
          postlist=updateData;
          await setTempRedis(myPostKey,JSON.stringify(updateData));
          res.json(sendData);
        });
        break;
      }
      //console.log("다시 위로"+Object.keys(postlist.Post).length+req.body.year);
    } while (1);
  });

});


router.post('/getUserPost', async function(req,res){
  var userId;//찾고자 하는 userId
    var data={};
    let nickname=req.body.nickname;//보고싶은 유저의 nickname
    console.log(req.body);
    tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
    myId=tokenValues.body.id;//요청한사람 id 파싱
    var isFollowed;//유저팔로우 여부
    var findResult;
    var posts={};
    var isLikeList={};//게시물 좋아요 여부
    var currentDateId;
    var postlist;
    var indexDate, lastIndexDate;
    var newDate, newYear, newMonth, newToday, newPostDate;
    const minimumDate = 20200129;
    var checkDate;
    var onePageValue=10;
    var finddate = 6;
    console.log("first test:"+req.body.date);
    console.log(req.body.year,req.body.month,req.body.date);
    if(req.body.isLastUserPost==1){
      res.json({
        code:200,
        message:"마지막 게시물입니다."
      });
    }

    await User.findAll({
      where:{nickname:nickname},
      attributes:['id']
    })
    .then(result=>{
      //console.log(result.nickname);
      userId=result[0].id;
    });
    console.log(userId);
    var myUserPostKey='userPost'+myId+userId;//redis에 저장된 나의 key
    await Follow.findAll({
      where:{
        followerId:myId,
        followingId:userId
      },
      paranoid:true
    })
    .then(result=>{
      findResult=result;
    })

    if(isEmpty(findResult)){
      isFollowed=0;
    }else{
      isFollowed=1;
    }

    data.isFollowed=isFollowed;
    if(req.body.year==null){
      tempPost.del(myUserPostKey);
      console.log('redis reset success');
    };
    tempPost.get(myUserPostKey, async function (err, result) {
      var data = {};
      if(result==null){
        console.log('first');
      }else{  
        newYear=req.body.year;
        newMonth=req.body.month;
        newToday=req.body.date;//사용자에게서 온 Date를 설정
        postlist = JSON.parse(result);
      }
      //console.log(result);
      do { 
        /* 완전한 첫번째 요청 */
        if (req.body.year == null && isEmpty(data) && postlist == null) {
          console.log("first req");
          var dateNow = new Date();
          var nowToday = dateNow.getDate();
          dateNow.setDate(nowToday - finddate);
          newYear = dateNow.getFullYear();
          newMonth = dateNow.getMonth();
          newToday = dateNow.getDate();
          indexDate = newYear.toString() + newMonth.toString() + newToday.toString();
          checkDate = checkOver(newYear,newMonth,newToday);
          if (Number(checkDate) <= minimumDate) {
            //서비스를 시작한 첫번째 날보다 전 날짜 나올때
            console.log("첫번째 피드요청인데 첫날까지 돌아감");
            indexDate = minimumDate;
            let tempdata={};
            let Posts=[];
            await Post.find({
              userId: userId,
              id: { '$gt': 0 }
            })
            .then(async result => {
              Posts=result;
            });
            let isLikeList=await checkLike(userId,Posts);
              //console.log(isLikeList);
            data.Post = Posts;
            data.isLiked=isLikeList;
            data.Year = 2020;
            data.Month = 1;
            data.Date = 29;
            data.isLastUserPost = 1;
            data.isFollowed=isFollowed;
            client.del(myUserPostKey);
            res.json(data);
            break;
          }else{
            console.log("첫번째 find");
            console.log(indexDate);
            let tempdata={};
            let Posts=[];
            await Post.findOne({ date: indexDate })
            .then(result => {
              console.log("first find Index");
              currentDateId = result.id;
            });
            await Post.find({
              userId: userId,
              id: { '$gt': currentDateId }
            })
            .then(async result => {
              Posts=result;
            });
            console.log("처음 찾은 게시물 : "+Object.keys(Posts).length);
            console.log(newYear,newMonth,newToday);
            var isLikeList=await checkLike(userId,Posts);
            data.Post = Posts;//Post List
            data.isLiked=isLikeList;
            data.Year = newYear;
            data.Month = newMonth;
            data.Date = newToday;
            data.isLastUserPost = 0;
            data.isFollowed=isFollowed;
            postlist=data;
            //console.log(Object.keys(data.Post).length,Object.keys(data.isLiked).length);
            console.log("first find Post");
            console.log("first update Success");
            //console.log(data);
            await setTempRedis(myUserPostKey, JSON.stringify(data));
          }
        } else if (req.body.year != null && (postlist==null||postlist.Post==null||Object.keys(postlist.Post).length < onePageValue)) {
          //2번째 요청부터 redis에 저장된 게시물이 30개 이하일때, redis에 저장한 게시물 없을때
          //console.log('redis에 저장된 게시물 개수 : '+Object.keys(postlist.Post).length);
          console.log(newYear,newMonth,newToday);
          var lastDate = newYear.toString() + newMonth.toString() + newToday.toString();
          newDate = new Date(newYear, newMonth, newToday-2);
          newYear = newDate.getFullYear();
          newMonth = newDate.getMonth();
          newToday = newDate.getDate();
          newPostDate = newYear.toString() + newMonth.toString() + newToday.toString();
          console.log(lastDate,newPostDate);
          checkDate=checkOver(newYear,newMonth,newToday);
    
          await Post.findOne({ date: lastDate })
          .then(resultDate => {
            lastDateId = resultDate.id;
          });
    
          if (Number(checkDate) <= minimumDate) {
            console.log('재 피드요청 but 30개 못넘고 마지막날까지 탐색');
            //서비스를 시작한 첫번째 날보다 전 날짜 나올때
            indexDate = minimumDate;
            let tempdata={};
            let Posts=[];
            let getlast=await getTempRedis(myUserPostKey);
            let lastdata = JSON.parse(getlast);
            await Post.find({
              userId: userId,
              'id': { '$gt':0, '$lt':lastDateId}
            })
            .then(async result => {
              Posts=result;
            })
            .catch(err=>{
              console.log(err);
            });
            let isLikeList=await checkLike(userId,Posts);
            //console.log(isLikeList);
            for(var i=0;i<Object.keys(Posts).length;i++){
              let getPostId=Posts[i]._id;
              lastdata.Post.push(Posts[i]);
              lastdata.isLiked[getPostId]=isLikeList[getPostId];
            }
            lastdata.Year = 2020;
            lastdata.Month = 1;
            lastdata.Date = 29;
            lastdata.isLastUserPost = 1;
            lastdata.isFollowed=isFollowed;
            //console.log(lastdata);
            //client.set(myId, JSON.stringify(lastdata));
            //tempPost.del(myUserPostKey);
            res.json(lastdata);
            break;
          } else {
            console.log("재 피드요청 but not over 30");
            indexDate=newPostDate;
            let getlast=await getTempRedis(myUserPostKey);
            let lastdata = JSON.parse(getlast);
            await Post.findOne({ 
              date: indexDate 
            })
            .then(result => {
              currentDateId = result.id;
            });
            var data={};
            var Posts=[];
            await Post.find({
              userId: userId,
              id: { '$gt': currentDateId, '$lt': lastDateId }
            })
            .then(async result4 => {
              Posts=result4;
            });
            
            let isLikeList=await checkLike(userId,Posts);
            console.log("추가할 게시물:"+Object.keys(Posts).length);
            for(var i=0;i<Object.keys(Posts).length;i++){
              let getPostId=Posts[i]._id;
              lastdata.Post.push(Posts[i]);
              lastdata.isLiked[getPostId]=isLikeList[getPostId];
            }
            console.log("재피드 요청 개수 :"+Object.keys(lastdata.Post).length)
            lastdata.Year=newYear;
            lastdata.Month=newMonth;
            lastdata.Date=newToday;
            lastdata.isLastUserPost=0;
            lastdata.isFollowed=isFollowed;
            postlist=lastdata;
            await setTempRedis(myUserPostKey,JSON.stringify(lastdata));
          }
        } else if (req.body.year == null && (postlist==null||postlist.Post==null||Object.keys(postlist.Post).length < onePageValue)) {
          //첫번째 요청에서 30개가 되지 않았을때
          console.log('첫번째 요청 but not over 30');
          let lastdata;
          var lastDate = newYear.toString() + newMonth.toString() + newToday.toString();//이전에 저장된 date
          var lastDateId;
          console.log(newYear, newMonth, newToday,lastDate);
          var dateNow = new Date(newYear, newMonth, newToday - finddate);
          newYear = dateNow.getFullYear();
          newMonth = dateNow.getMonth();
          newToday = dateNow.getDate();
          indexDate = newYear.toString() + newMonth.toString() + newToday.toString();
    
          checkDate=checkOver(newYear,newMonth,newToday);//날짜 자리수
    
          console.log("indexDate"+indexDate);
          if (Number(checkDate) <= minimumDate) {
            console.log('첫번째 요청인데 30개가 안되는데 가다보니 첫번째 날일때');
            //서비스를 시작한 첫번째 날보다 전 날짜 나올때
            indexDate = minimumDate;
            let tempdata={};
            let Posts=[];
            await Post.findOne({ date: lastDate })
            .then(result => {
              //console.log(result)
              lastDateId = result.id;
            });
            
            await Post.find({
              userId: userId,
              id: { '$gt': 0, '$lt': lastDateId }
            })
            .then(result2=>{
              Posts=result2;
            }
            );
    
            var beforeData = await getTempRedis(myUserPostKey);
            lastdata = JSON.parse(beforeData);
            let isLikeList=await checkLike(userId,Posts);
            for(var i=0;i<Object.keys(Posts).length;i++){
              let getPostId=Posts[i]._id;
              lastdata.Post.push(Posts[i]);
              lastdata.isLiked[getPostId]=isLikeList[getPostId];
            }
            lastdata.Year = 2020;
            lastdata.Month = 1;
            lastdata.Date = 29;
            lastdata.isLastUserPost = 1;
            lastdata.isFollowed=isFollowed;
            await setTempRedis(myUserPostKey, JSON.stringify(lastdata));
            res.json(lastdata);
            break;
          } else {
            console.log('첫번째 요청인데 30개가 안될때');
            let lastDateId;
            await Post.findOne({ 
              date: lastDate 
            })
            .then(result=>{
              lastDateId=result.id;
            });
            var Posts=[];
            await Post.findOne({ 
              date: indexDate 
            })
            .then(async result => {
              currentDateId = result.id;//7일전 날짜
              await Post.find({
                userId: userId,
                id: { '$gt': currentDateId, '$lt': lastDateId }
              })
              .then(result => {
                Posts=result;
              });
              
              var getLastData=await getTempRedis(myUserPostKey);
                //console.log(getLastData);
              lastdata = JSON.parse(getLastData);
              let isLikeList=await checkLike(userId,Posts);
              if(lastdata.Post!=undefined){
                for(var i=0;i<Object.keys(Posts).length;i++){
                  let getPostId=Posts[i]._id;
                  lastdata.Post.push(Posts[i]);
                  lastdata.isLiked[getPostId]=isLikeList[getPostId];
                }
              } 
              lastdata.Year=newYear;
              lastdata.Month=newMonth;
              lastdata.Date=newToday;
              lastdata.isLastUserPost=0;
              lastdata.isFollowed=isFollowed;
              postlist=lastdata;
              await setTempRedis(myUserPostKey,JSON.stringify(lastdata));
              console.log('redis 설정 완료'+Object.keys(lastdata).length)
            });
          }//30개 이하로 redis에 저장될때 조건 끝
        }else if(req.body.year!=null&&Object.keys(postlist.Post).length>=onePageValue){//30개 이상 redis에 있을때
          console.log("재 피드요청 over 30");
          let lastdata;
          let Post=[];
          let Likes={};
          let sendData={};//front로 보내주는애들
          let updateData={};//front에 보낸 게시물을 제외한 나머지 애들을 다시 redis로
          let afterPost=[];
          let afterLike={};
          tempPost.get(myUserPostKey,async function(err,result){
            lastdata=JSON.parse(result);
            for(let i=0;i<onePageValue;i++){
              let getPostId=lastdata.Post[i]._id;
              Post.push(lastdata.Post[i]);
              Likes[getPostId]=lastdata.isLiked[getPostId];
            }
            for(let i=0;i<Object.keys(lastdata.Post).length;i++){
              let getPostId=lastdata.Post[i]._id;
              afterPost.push(lastdata.Post[i]);
              afterLike[getPostId]=lastdata.isLiked[getPostId];
            }
            
            for(let i=0;i<onePageValue;i++){
              let getPostId=lastdata.Post[i]._id;
              delete afterLike[getPostId];
            }//이미 띄운 피드 삭제
            afterPost.splice(0,onePageValue);
            sendData.Post=Post;
            sendData.isLiked=Likes;
            sendData.Year=lastdata.Year;
            sendData.Month=lastdata.Month;
            sendData.Date=lastdata.Date;
            sendData.isLastUserPost=0;
            sendData.isFollowed=isFollowed;
            updateData.Post=afterPost;
            updateData.isLiked=afterLike;
            updateData.Year=lastdata.Year;
            updateData.Month=lastdata.Month;
            updateData.Date=lastdata.Date;
            updateData.isLastUserPost=0;
            updateData.isFollowed=isFollowed;
            postlist=updateData;
            await setTempRedis(myUserPostKey,JSON.stringify(updateData));
            res.json(sendData);
          });
          break;
        }else if(req.body.year==null&&Object.keys(postlist.Post).length>=onePageValue){
          console.log("첫 피드 요청 over 30");
          let lastdata;
          let sendData={};
          let updateData={};
          let Post=[];
          let Likes={};
          let afterPost=[];
          let afterLike={};
          tempPost.get(myUserPostKey,async function(err,result){
            lastdata=JSON.parse(result);
            for(let i=0;i<onePageValue;i++){
              let getPostId=lastdata.Post[i]._id;
              Post.push(lastdata.Post[i]);
              Likes[getPostId]=lastdata.isLiked[getPostId];
            }
            //console.log(Likes);
            for(let i=0;i<Object.keys(lastdata.Post).length;i++){
              let getPostId=lastdata.Post[i]._id;
              afterPost.push(lastdata.Post[i]);
              afterLike[getPostId]=lastdata.isLiked[getPostId];
            }
            for(let i=0;i<onePageValue;i++){
              let getPostId=lastdata.Post[i]._id;
              delete afterLike[getPostId];
            }//이미 보낸 LikeList삭제
            afterPost.splice(0,onePageValue);//이미 보낸 Post삭제
            sendData.Post=Post;
            sendData.isLiked=Likes;
            sendData.Year=lastdata.Year;
            sendData.Month=lastdata.Month;
            sendData.Date=lastdata.Date;
            sendData.isLastUserPost=0;
            sendData.isFollowed=isFollowed;
            updateData.Post=afterPost;
            updateData.isLiked=afterLike;
            updateData.Year=lastdata.Year;
            updateData.Month=lastdata.Month;
            updateData.Date=lastdata.Date;
            updateData.isLastUserPost=0;
            updateData.isFollowed=isFollowed;
            postlist=updateData;
            await setTempRedis(myUserPostKey,JSON.stringify(updateData));
            res.json(sendData);
          });
          break;
        }
        //console.log("다시 위로"+Object.keys(postlist.Post).length+req.body.year);
      } while (1);
    });
  
});


router.post('/Clicklike',async function(req,res){
  var token_values=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
  var objectId=req.body.objectId;
  var findResult;
  var alreadyLike;
  var myId=token_values.body.id;
  var userId=req.body.userId;
  var notiBody={
    'send_user':token_values.body.nickname,
    'rec_user':userId,
    'post_id':objectId
  };
  await Likes.findAll({
    where:{
      object_Id:objectId,
      liker:token_values.body.id
    }
  })
  .then(result=>{
    findResult=result;
  });
//이전에 Like를 눌렀는지 체크

  if(isEmpty(findResult)){
    await Likes.create({
      object_Id:objectId,
      liker:token_values.body.id
    })
    .then(async result=>{
      await Post.findOneAndUpdate({
        _id:objectId
      },
      {
        $inc:{likes_num:1}
      },
      )
      .then(async function(){
        console.log("increse success");
        await Follow.findOne({where:{
          followerId:myId,followingId:userId
        }})
        .then(async result=>{
          if(result!=null){
            await Follow.increment('like_num',
            {
              where:{
                id:result.id
              }
            });
          }
        });
      })
      axios.post("http://localhost:3006/noti/like",notiBody);

      res.json({
        code:200,
        message : "like"
      })
    })
    .catch(err=>{
      console.log(err);
      res.json({
        code:500,
        message:"오류가 발생하였습니다."
      })
    });

  }else{
    await Likes.destroy({where:{
      object_Id:objectId,
      liker:token_values.body.id
    }})
    .then(async result=>{
      await Post.findOneAndUpdate({
        _id:objectId
      },{
        $inc:{
          likes_num:-1
        }
      })
      .then(async function(){
        console.log("decrese success");
        await Follow.findOne({
          where:{
            followerId:myId,followingId:userId
          }
        })
        .then(async result=>{
          if(result!=null){
            await Follow.decrement('like_num',
            {
              where:{
                id:result.id
              }
            });
          }
        })
      });
      notiBody.status='like';
      axios.delete("http://localhost:3006/noti/unlike",notiBody);
      res.json({
        code:200,
        message:'unlike'
      })
    })
    .catch(err=>{
      console.log(err); 
      res.json({
        code:500,
        message:"오류가 발생하였습니다."
      })
    });
  }
});

router.post('/createReply',function(req,res){
  var token_values=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
  var {objectId}=req.body;
  var {replyContents}=req.body;
  var nickname=token_values.body.nickname;
  var myId=token_values.body.id;
  var userId=req.body.userId;
  var notiBody={
    'send_user':token_values.body.nickname,
    'rec_user':userId,
    'post_id':objectId
  };
  //console.log(userId);
  Reply.create({
    writer:nickname,
    replyContents:replyContents,
    objectId:objectId,
  })
  .then(async result=>{
    await Post.findOneAndUpdate({
      _id:objectId
    },{
      $inc:{
        reply_num:1
      }
    })
    .then(async function(){
      await Follow.findOne({
        where:{
          followerId:myId,followingId:userId
        }
      })
      .then(async result=>{
        if(result!=null){
          await Follow.increment('comment_num',
          {
            where:{id:result.id}
          });
        }
      })
    });
    notiBody.replyContents=replyContents;
    axios.post("http://localhost:3006/noti/reply",notiBody);
    res.json({
      code:200,
      message:'create'
    })
  })
  .catch(err=>{
    console.log(err);
    res.json({
      code:500,
      message:'에러가 발생하였습니다.'
    })
  });
});

router.post('/getReply',async function(req,res){
  var {objectId}=req.body;
 await Reply.findAll({
 where:{
   objectId:objectId,
  },
  attributes:['writer','replyContents']
 })
 .then(result=>{
    //console.log(result);
    res.json(result);
  })
  .catch(err=>{
    console.log(err);
    res.json({
      code:500,
      message:'에러가 발생하였습니다.'
    })
  })
});
    
// Posts - edit // 4
/*
router.get('/:id/edit', function(req, res){
  Post.findOne({_id:req.params.id}, function(err, Post){
    if(err) return res.json(err);
    res.render('Posts/edit', {Post:Post});
  });
});

// Posts - update // 5
router.put('/:id', function(req, res){
  Post.findOneAndUpdate({_id:req.params.id}, req.body, function(err, Post){
    if(err) return res.json(err);
    res.redirect('/Posts/'+req.params.id);
  });
});
*/

router.get('/resetMyRedis', async function(req,res){
  var tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
  var myId=tokenValues.body.id;
  var mytempPost="myPost"+myId;
  tempPost.del(mytempPost);
});

router.post('/resetUserRedis', async function(req,res){
  var tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
  var myId=tokenValues.body.id;
  var mytempPost="myPost"+myId;
  tempPost.del(mytempPost);
});
// Posts - destroy // 6
router.delete('/:id', async function(req, res){
  try { 
      Post.deleteOne({_id:req.params.id}, function(err){
        console.log('delete complete');
      });
  }catch(err){
    console.log(err);
  }

});

module.exports = router;
