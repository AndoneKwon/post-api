var express = require('express');
var router = express.Router();
var Post = require('../models/post'); // 
var nJwt = require('njwt');
var nickname;
// Posts - create ; insert -> insert_ok
router.post('/create', async function(req, res){
  try{
    token_values=nJwt.verify(req.headers.authorization,'nodebird', 'HS256');
    const post_value = new Post();
    post_value.title=req.body.title;
    post_value.writer=tokenValues.body.nickname;
    post_value.contents=req.body.content;
    post_value.uid=tokenValues.body.uid;
    await post_value.save(function(err, post_value){
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
router.get('/mypost', async function(req,res){
  try{
    nickname=nJwt.verify(req.headers.authorization,'nodebird', 'HS256');
    Post.find({writer:nickname.body.uid},function(err, Post){
      console.log(JSON.stringify(Post));
      res.status(200).send(JSON.stringify(Post));
    });
  } catch(err){
    console.log(err);
    res.status(500).send(err);
  }
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
