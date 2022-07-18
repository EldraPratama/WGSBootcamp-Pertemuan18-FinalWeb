const express      = require('express')
var expressLayouts = require('express-ejs-layouts');
var morgan         = require('morgan')

const { body, validationResult,check } = require('express-validator');
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash')


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
app.use(express.urlencoded())

//konfigurasi flash
app.use(cookieParser('secret'))
app.use(
  session({
    cookie : {maxAge:6000},
    secret : 'secret',
    resave : true,
    saveUninitialized : true ,
  })
)
app.use(flash())


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
       statusData:0,
       cont,
       msg : req.flash('msg'),
       msg2 : req.flash('msg2')
    })
})

//mengambil data dari json lalu mengirimkan datanya ke contact
app.get('/contact/add', (req, res) => {
     res.render('add-contact',{ 
       title:'Contact Page',
    })
})

//proses input data
app.post('/contact',
  //validasi input data
  body('name').custom((value) => {
    const duplikat = contacts.cekDuplikat(value)
    if (duplikat) {
      throw new Error('Nama contact sudah ada!')
    }
    return true
  }),
  check('email','Email tidak valid').isEmail(),
  check('phone','Nomer Telepon tidak valid').isMobilePhone('id-ID'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('add-contact',{ 
        title:'Contact Page',
        errors:errors.array(),
        cont:req.body,
      })    
    }else{
      contacts.SaveContact(req.body)  
      //mengirim flash
      req.flash('msg','Data contact berhasil di Tambah')
      res.redirect('/contact')
    }
})

// menampilkan list contact
app.get('/contact', (req, res) => {
  //mengambil data dari json lalu mengirimkan datanya ke contact
  cont = contacts.listContact()
     res.render('contact',{ 
       title:'Contact Page',
       cont,
    })
})
  
// menampilkan detail contact
app.get('/contact/:name', (req, res) => {
    //mengambil data dari json lalu mengirimkan datanya ke contact
      cont = contacts.detailContact( req.params.name )
      res.render('detailContact',{ 
        title:'Contact Page',
        cont,
    })
})
 
// mengedit contact
app.get('/contact/edit/:name', (req, res) => {

    //mengecek apakah nama yang akan di edit terdaftar 
    //jika tidak terdaftar akan dikembalikan ke halaman contact
    const contact = contacts.findContact(req.params.name)
    if (!contact) {
      req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
      res.redirect('/contact')   
    //jika terdaftar akan ke halaman edit contact
    }else{
      cont = contacts.detailContact( req.params.name )
      res.render('edit-contact',{ 
        title:'Contact Page',
        cont,
      })
    }
})

//proses update data
app.post('/contact/edit',
  //validasi input data
  body('new_name').custom((value, {req}) => {
    const duplikat = contacts.cekDuplikat(value)
    if (value !== req.body.name && duplikat) {
      throw new Error('Nama contact sudah ada!')
    }
    return true
  }),
  check('email','Email tidak valid').isEmail(),
  check('phone','Nomer Telepon tidak valid').isMobilePhone('id-ID'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('edit-contact',{ 
        title:'Contact Page',
        errors:errors.array(),
        cont : req.body,
      })    
    }else{
      contacts.updateContact(req.body)
      req.flash('msg','Data contact berhasil di Update')  
      res.redirect('/contact/')
    }
})

// menghapus data 
app.get('/contact/delete/:name', (req, res) => {
    //mengecek apakah nama yang di hapus terdaftar
    const contact = contacts.findContact(req.params.name)
    if (!contact) {
      req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
      res.redirect('/contact')   
    }else{
      contacts.deleteContact( req.params.name )
      req.flash('msg','Data contact berhasil di Delete')
      res.redirect('/contact')
    }
})

  
// app.get('/product/:id', (req, res) => {
//     res.send(`product id: ${req.params.id} <br> category id : ${ req.query.category}`)
// })

app.use('/', (req, res) => {
  res.status(404)
  res.send('Not found')
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
