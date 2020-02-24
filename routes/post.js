var express = require('express');
var router = express.Router();
var Post = require('../schema/post'); //
var nJwt = require('njwt');
var {Follow} = require('../models');
var {User}=require('../models');
var {Likes}=require('../models');
var tokenValues;
var dotenv = require('dotenv').config();

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
    tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
    const postValue = new Post();
    postValue.title=req.body.title;
    postValue.writer=tokenValues.body.nickname;
    postValue.contents=req.body.content;
    postValue.uid=tokenValues.body.uid;
    await postValue.save(function(err, postvalue){
      if(err) return console.log(err);
      console.log("Create Success");
      res.status(200).send("post create");
    });
  } catch (err){
    console.log(err);
    res.status(500).send(err);
  }
});
// Posts - read ; 원하는 정보만 표시~ findOne 메소드
router.get('/getMyPost', async function(req,res){
  try{
    let nickname=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
    Post.find({writer:nickname.body.nickname},function(err, Post){
      console.log(Post);
      console.log(JSON.stringify(Post));
      res.status(200).send(JSON.stringify(Post));
    });
  } catch(err){
    console.log(err);
    res.status(500).send(err);
  }
});

router.post('/getUserPost', async function(req,res){
  var userId;//찾고자 하는 userId
  try{
    var data={};
    let nickname=req.body.nickname;
    tokenValues=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
    myId=tokenValues.body.id;//요청한사람 id 파싱
    var isFollowed;
    var findResult;
    var posts;

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
      console.log("result"+findResult);
    })

    if(isEmpty(findResult)){
      isFollowed=0;
    }else{
      isFollowed=1;
    }

    data.isFollowed=isFollowed;
    console.log(data);

    await Post.find({writer:nickname},function(err, Post){
      //console.log(Post);
      posts=Post;
    });
    //console.log(post);
    data.Post=posts;
    console.log(data);
    res.json(data);
  
  } catch(err){
    console.log(err);
    res.status(500).send(err);
  }
});


router.post('/Clicklike',async function(req,res){
  var token_values=nJwt.verify(req.headers.authorization,process.env.JWT_SECRET, 'HS256');
  var objectId=req.body.objectId;
  var findResult;
  var alreadyLike;

  console.log("dddddddddd:"+objectId);

  await Likes.findAll({
    where:{
      object_Id:objectId,
      liker:token_values.body.id
    }
  })
  .then(result=>{
    findResult=result;
  });

  console.log(isEmpty(findResult));

  if(isEmpty(findResult)){
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

    Likes.create({
      object_Id:objectId,
      liker:token_values.body.id
    })
    .then(result=>{
      res.json({
        code:200,
        message : "like success"
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
    }
    );

    await Likes.destroy({where:{
      object_Id:objectId,
      liker:token_values.body.id
    }})
    .then(result=>{
      res.json({
        code:200,
        message:'unlikes success'
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

})
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
