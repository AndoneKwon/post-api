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


var isEmpty = function(value){ 
  if( value == "" || value == null || value == undefined || ( value != null && typeof value == "object" && !Object.keys(value).length ) ){ 
    return true 
  }else{ 
    return false 
  } 
};

// Posts - create ; insert -> insert_ok
router.post('/create', async function(req, res){
  try{
    client.get("lastPostIndex",async function(err,result){
      var id=Number(result)+1;
      tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
      const postValue = new Post();
      postValue.title=req.body.title;
      postValue.writer=tokenValues.body.nickname;
      postValue.contents=req.body.content;
      postValue.uid=tokenValues.body.uid;
      postValue.id=id;
      await postValue.save(function(err, postvalue){
        if(err) return console.log(err);
        console.log("Create Success");
        client.set("lastPostIndex",id);
        res.status(200).send("post create");
      })
      .catch(err=>{
        console.log(err);
        res.json({
          code:500,
          message:"오류 발생함."
        });
      });
    });
  } catch (err){
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
    };

    /* data에 모든 정보를 집어넣고 json으로 front서버에 전송 */
    console.log(data);
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
      //console.log(result);
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
    console.log(data);
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
    .then(result=>{
      Post.findOneAndUpdate({
        _id:objectId
      },{
        $inc:{
          likes_num:1
        }
      },async function(err,result){
        try{
          console.log("increse success");
        } 
        catch{
          console.log(err);
          res.json({
            code:500,
            message:'like error'
          });
        }
      })

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
    .then(result=>{
      Post.findOneAndUpdate({
        _id:objectId
      },{
        $inc:{
          likes_num:-1
        }
      },async function(err,result){
        try{
          console.log("decrease sueccess");
        } 
        catch{
          console.log(err);
          res.json({
            code:500,
            message:'오류가 발생하였습니다.'
          });
        }
      });

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

  Reply.create({
    writer:nickname,
    replyContents:replyContents,
    objectId:objectId,
  })
  .then(result=>{

    Post.findOneAndUpdate({
      _id:objectId
    },{
      $inc:{
        reply_num:1
      }
    },async function(err,result){
      try{
        console.log("increse success");
      } 
      catch{
        console.log(err);
        res.json({
          code:500,
          message:'like error'
        });
      }
    })

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
  /*
  await Reply.findAll({
    where:{
      objectId:objectId,
    }
  })
  .then(result=>{
    console.log(result);
    res.json(result);
  })
  .catch(err=>{
    console.log(err);
    res.json({
      code:500,
      message:'에러가 발생하였습니다.'
    })
  })
  */
 await Reply.findAll({
 where:{
   objectId:objectId,
  },
  attributes:['writer','replyContents']
 })
 .then(result=>{
    console.log(result);
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
