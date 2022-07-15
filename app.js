const express      = require('express')
var expressLayouts = require('express-ejs-layouts');
var morgan         = require('morgan')
const contacts     = require('./data/contact.js');
const app          = express()
const port         = 3000

//menjalankan morgan
app.use(morgan('dev'))

//menggunakan ejs
app.set('view engine','ejs')
app.use(expressLayouts);

//menggunakan layout yg ini
app.set('layout', 'layout/layout');

//Mengizinkan file gambar diakses
app.use(express.static('public'))

app.use((req, res, next) => {
  console.log('Time:', Date.now())
  next()
})


//untuk halaman index
app.get('/', (req, res) => {
  res.render('index',
  {
    nama:'Eldra Surya P',
    title:'WebServer EJS',
  })
})


//untuk halaman about
app.get('/about', (req, res) => {
    res.render('about',{ title:'About Page'})

})


//untuk halaman contact
app.get('/contact', (req, res) => {
  //mengambil data dari json lalu mengirimkan datanya ke contact
  cont = contacts.listContact()
     res.render('contact',{ 
       title:'Contact Page',
       cont,
    })
  })
  
app.get('/contact/:name', (req, res) => {
      //mengambil data dari json lalu mengirimkan datanya ke contact
       cont = contacts.detailContact( req.params.name )
       res.render('detailContact',{ 
        title:'Contact Page',
        cont,
      })
  })
  
app.get('/product/:id', (req, res) => {
    res.send(`product id: ${req.params.id} <br> category id : ${ req.query.category}`)
})

app.use('/', (req, res) => {
  res.status(404)
  res.send('Not found')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
