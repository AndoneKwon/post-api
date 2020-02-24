module.exports = (sequelize, DataTypes)=>(
    sequelize.define('reply',{
        object_id :{
            type : DataTypes.STRING(70),
            allowNull : false,
            unique : true,
        },

        reply_contentes : {
            type : DataTypes.STRING(500),
            allowNull : true,
        },

        reply_num : {
            type : DataTypes.INTEGER,
            allowNull : false,
            defaultValue : 0,
        },

        likes : {
            type : DataTypes.INTEGER,
            allowNull : false,
            defaultValue : 0,
        },


        writer : {
            type : DataTypes.STRING(40),
            allowNull : false,
        },
    
    },
    )

);