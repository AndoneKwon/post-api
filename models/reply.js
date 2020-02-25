module.exports = (sequelize, DataTypes)=>(
    sequelize.define('reply',{
        objectId :{
            type : DataTypes.STRING(70),
            allowNull : false,
        },

        writer : {
            type : DataTypes.STRING(40),
            allowNull : false,
        },

        replyContents : {
            type : DataTypes.STRING(500),
            allowNull : false,
        },

    },
    {
    }
    )

);