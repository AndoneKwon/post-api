var express = require('express');
var router = express.Router();
var Post = require('../schema/post'); //
var nJwt = require('njwt');
var {Follow} = require('../models');
var {User}=require('../models');
var {Likes}=require('../models');
var {Reply}=require('../models');
var tokenValues;
var dotenv = require('dotenv').config();
const client = require('../cache_redis');
const axios = require('axios');
var {promisify} = require('util');
const getRedis = promisify(client.get).bind(client);
const multer = require('multer');

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
            postValue.file = req.file;
            
            await postValue.save(async function(err, postvalue){
              if(err) return console.log(err);
              await Follow.findAll({
                where:{
                  followingId:tokenValues.body.id
                },
                attributes:['followerId']
              })
              .then(result=>{
                console.log(typeof result);
              })
              res.status(200).send("post create");
            });
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
                console.log(typeof result);
              })
              res.status(200).send("post create");
            });
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
router.get('/getMyPost', async function(req,res){
  var posts={};//post들만 저장
  var data={};//전체데이터 object
  var isLikeList={};//게시물 좋아요 여부
  try{
    var token_values=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
    var myId=token_values.body.id;
    await Post.find({writer:token_values.body.nickname})
    .then(result=>{
      posts=result;
    })
    .catch(err=>{
      res.json({
        code:500,
        message:'오류가 발생하였습니다.'
      })
    });
    
    /* likes table을 찾아서 like여부 확인 */
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
        isLikeList[objectId]=isLike;
      });
    }

    /* data에 모든 정보를 집어넣고 json으로 front서버에 전송 */
    
    data.Post=posts;
    data.isLiked=isLikeList;
    res.json(data);
  } 
  catch(err){
    console.log(err);
    res.status(500).send(err);
  }

});

router.post('/getUserPost', async function(req,res){
  var userId;//찾고자 하는 userId
  try{
    var data={};
    let nickname=req.body.nickname;//보고싶은 유저의 nickname
    tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
    myId=tokenValues.body.id;//요청한사람 id 파싱
    var isFollowed;//유저팔로우 여부
    var findResult;
    var posts={};
    var isLikeList={};//게시물 좋아요 여부
    var aJson = new Object();

    await User.findAll({
      where:{nickname:nickname},
      attributes:['id']
    })
    .then(result=>{
      //console.log(result.nickname);
      userId=result[0].id;
    });

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

    await Post.find({writer:nickname},function(err, Post){
      posts=Post;
    });


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
        isLikeList[objectId]=isLike;
      });
    };
    
    data.Post=posts;
    data.isLiked=isLikeList;
    //console.log(data.isLiked);
    res.json(data);
  
  } catch(err){
    console.log(err);
    res.json({
      code:500,
      message:'에러가 발생하였습니다.'
    });
  }
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
      axios.post("http://localhost:3006/noti/unlike",notiBody);
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
    'send_user':myId,
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
