const  Pool  = require('pg').Pool

const  pool  = new Pool({
    user    :"postgres",
    password:"wgs",
    database:"db_absence",
    host    :"localhost",
    port    :5432
})

module.exports = pool

