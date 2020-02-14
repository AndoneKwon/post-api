const jwt = require('jsonwebtoken');
const client = require('../cache_redis');


exports.verifyToken = (req, res, next) => {
    try{
        req.decoded = jwt.verify(req.headers.authorization, process.env.JWT_SECRET);

        //이메일인증 제때 안하면 토큰 인증 X
        if(req.status === 1){
            if(!client.get(req.nickname)){
                return res.status(401).json({
                    code : 401,
                    messgae : '유효하지 않는 토큰',
                });
            }
        }


        return next();
    }
    catch(error){
        if(error.name === 'TokenExpiredError'){
            return res.status(419).json({
                code : 419,
                messgae : '토큰이 만료',
            });
        }

        return res.status(401).json({
            code : 401,
            messgae : '유효하지 않는 토큰',
        });
    }
    
};