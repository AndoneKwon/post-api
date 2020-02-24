module.exports = (sequelize, DataTypes)=>(
    sequelize.define('location',{
        object_id :{
            type : DataTypes.STRING(70),
            allowNull : false,
            unique : true,
        },

        latitiude : {
            type : DataTypes.FLOAT,
            allowNull : true,
        },

        longitiude : {
            type : DataTypes.FLOAT,
            allowNull : true,
        },
    
    },
    
        {
            paranoid : true,
        }

    
    )

);