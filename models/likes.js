module.exports = (sequelize, DataTypes)=>(
    sequelize.define('likes',{
        object_Id :{
            type : DataTypes.STRING(70),
            allowNull : false,
            primaryKey: true
        },
        liker :{
            type : DataTypes.STRING(70),
            allowNull : false,
            primaryKey: true
        }
    },
    {
        primaryKey : true,
    }
    )
);