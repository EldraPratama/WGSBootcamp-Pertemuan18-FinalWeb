const express      = require('express')
var expressLayouts = require('express-ejs-layouts');
var morgan         = require('morgan')

const { body, validationResult,check } = require('express-validator');
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash')

const contacts     = require('./data/contact.js');
const pool         = require("./db") 
const app          = express()
const port         = 3001

app.use(express.json())
//menjalankan morgan
app.use(morgan('dev'))

//menggunakan ejs
app.set('view engine','ejs')
app.use(expressLayouts);

//menggunakan layout yg ini
app.set('layout', 'layout/layout');

//Mengizinkan file gambar diakses
app.use(express.static('public'))
app.use(express.urlencoded({extended:true}))

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

// app.get('/contact', async (req, res) => {
//   //mengambil data dari db lalu mengirimkan datanya ke contact
//     const listCont = await pool.query(`SELECT * FROM public.user`)
//     const cont = listCont.rows
//     console.log(cont);
//     res.render('contact',{ 
//       title:'Contact Page',
//       cont,
//       msg : req.flash('msg'),
//       msg2 : req.flash('msg2')
//    })
// })

// menampilkan detail contact
app.get('/contact/:name', async(req, res) => {
  //mengecek ada tidaknya data contact
  const contact = await findEmployee(req.params.name)
  if (!contact) {
    req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
    res.redirect('/contact')  
  }else{  
    //mulai proses menampilkan detail
    const employe = await pool.query(`SELECT * FROM public.user WHERE name='${req.params.name}'`)
    const cont = employe.rows[0]
    console.log(cont);
    res.render('detailContact',{ 
      title:'Contact Page',
      cont,
    })
  }
})


//menampilkan form tambah data
app.get('/contact/add', (req, res) => {
     res.render('add-employee',{ 
       title:'Contact Page',
    })
})

//proses input data
app.post('/contact',[
  //validasi input data
  body('name').custom( async (value) => {
    const duplikat = await findContact(value)
    if (duplikat) {
      throw new Error('Nama contact sudah ada!')
    }
    return true
  }),
  check('email','Email tidak valid').isEmail(),
  check('mobile','Nomer Telepon tidak valid').isMobilePhone('id-ID')
],async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('add-employee',
      { 
        title:'Contact Page',
        errors:errors.array(),
        cont:req.body,
      })    
    }else{
      // proses input
        const name   = req.body.name.toLowerCase()
        const mobile = req.body.mobile
        const email  = req.body.email
        const newCont = await pool.query(`INSERT INTO contact values('${name}','${mobile}','${email}')`)
        req.flash('msg','Data contact berhasil di Tambah')
        res.redirect('/contact')
    }
})


//menampilkan halaman edit
app.get('/contact/edit/:name', async (req, res) => {
  //mengecek ada tidaknya data contact
  const contact = await findContact(req.params.name)
  if (!contact) {
    req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
    res.redirect('/contact')  
  }else{
    //mulai proses edit
    const listCont = await pool.query(`SELECT * FROM contact WHERE name='${req.params.name}'`)
    const cont = listCont.rows[0]
    res.render('edit-contact',{ 
      title:'Contact Page',
      cont,
    })
  }
})

//proses update data
app.post('/contact/edit',
  //validasi input data
  body('new_name').custom( async (value, {req}) => {
    const duplikat = await findContact(value)
    console.log(duplikat);
    if (value !== req.body.name && duplikat ) {
      throw new Error('Nama contact sudah ada!')
    }
    return true
  }),
  check('email','Email tidak valid').isEmail(),
  check('mobile','Nomer Telepon tidak valid').isMobilePhone('id-ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('edit-contact',{ 
        title:'Contact Page',
        errors:errors.array(),
        cont : req.body,
      })    
    }else{
        const name     = req.body.name.toLowerCase()
        const new_name = req.body.new_name
        const mobile   = req.body.mobile
        const email    = req.body.email
        const newCont = await pool.query(`UPDATE contact SET name='${new_name}', mobile='${mobile}', email='${email}'
          WHERE name = '${name}'`)
        req.flash('msg','Data contact berhasil di Update')  
        res.redirect('/contact/')
    }
})

// menghapus data 
app.get('/contact/delete/:name', async (req, res) => {
    //mengecek apakah nama yang di hapus terdaftar
    const contact = await findContact(req.params.name)
    if (!contact) {
      req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
      res.redirect('/contact')  
    }else{
      const listCont = await pool.query(`DELETE FROM contact WHERE name = '${req.params.name}'`)
      req.flash('msg','Data contact berhasil di Hapus')  
      res.redirect('/contact/')
    }
})

//menampilkan form login
app.get('/login', (req, res) => {
  res.render('login',{ 
    title:'Contact Page',
 })
})



//menampilkan halaman absen
app.get('/absen/:name', async (req, res) => {
  const absence = await pool.query(`SELECT * FROM public.absence where name='${req.params.name}' and tgl='now()'`)
  console.log(absence.rows)
  res.render('absen',{ 
    title:'Contact Page',
    name:req.params.name,
    msg : req.flash('msg'),
    absen:absence.rows[0]
 })
})

//proses melakukan absen
app.post('/absen/:name',
  //validasi input data
  // body('name').custom( async (value) => {
  //   const duplikat = await findContact(value)
  //   if (duplikat) {
  //     throw new Error('Nama contact sudah ada!')
  //   }
  //   return true
  // })

 async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('absen',
      { 
        title:'Contact Page',
        errors:errors.array(),
        cont:req.body,
        name:req.params.name,
      })    
    }else{
      // proses input jam masuk
        const name   = req.body.name.toLowerCase()
        const absen = await pool.query(`SELECT * FROM public.absence where name='${req.params.name}' and tgl='now()'`)

        if ( typeof absen == 'undefined' || absen.jam_masuk == null ) {
          const absen = await pool.query(`INSERT INTO public.absence(name, tgl, jam_masuk) VALUES ('${name}', now(),now())`)
          req.flash('msg','Absen jam masuk berhasil')
          res.redirect('/absen/')
        } else if (  absen.jam_keluar == null ){
          const absen = await pool.query(`UPDATE public.absence SET  jam_keluar= now() WHERE name = '${name}'`)
          req.flash('msg','Absen jam keluar berhasil')
          res.redirect('/absen/')
        }
    }
})

//menampilkan employee
app.get('/employee', async (req, res) => {
  //mengambil data dari db lalu mengirimkan datanya ke contact
    const listCont = await pool.query(`SELECT * FROM public.user`)
    const cont = listCont.rows
    // console.log(cont);
    res.render('contact',{ 
      title:'Contact Page',
      cont,
      msg : req.flash('msg'),
      msg2 : req.flash('msg2')
   })
  //  console.log(morgan('dev'));
})

// menampilkan detail employee
app.get('/employee/:name', async(req, res) => {
  //mengecek ada tidaknya data contact
  const contact = await findEmployee(req.params.name)
  if (!contact) {
    req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
    res.redirect('/contact')  
  }else{  
    //mulai proses menampilkan detail
    const employe = await pool.query(`SELECT * FROM public.user WHERE name='${req.params.name}'`)
    const cont = employe.rows[0]
    console.log(cont);
    res.render('detailContact',{ 
      title:'Contact Page',
      cont,
    })
  }
})

//menampilkan form tambah data employee
app.get('/employee/add', (req, res) => {
  res.render('add-employee',{ 
    title:'Contact Page',
 })
})

//input data employee
app.post('/employee',[
  //validasi input data
  body('name').custom( async (value) => {
    const duplikat = await findEmployee(value)
    if (duplikat) {
      throw new Error('Nama employee sudah ada!')
    }
    return true
  })
],async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('absen',
      { 
        title:'Contact Page',
        errors:errors.array(),
        cont:req.body,
      })    
    }else{
      // proses absen
        const name     = req.body.name.toLowerCase()

  //       SELECT id, name, tgl, jam_masuk, jam_keluar
	// FROM public.absence where tgl='now()' and jam_masuk is null ;

        const newAbsen = await pool.query(`INSERT INTO public.absen
        (name, tgl, jam_masuk, jam_keluar)
         VALUES ('${name}', now(), now(), now());`)
     
        req.flash('msg','Data Absen berhasil di Tambah')
        res.redirect('/employee')
    }
})

// menghapus data 
app.get('/employee/delete/:name', async (req, res) => {
  //mengecek apakah nama yang di hapus terdaftar
  const contact = await findEmployee(req.params.name)
  if (!contact) {
    req.flash('msg2',`Nama Employee ${req.params.name} tidak tersedia`)
    res.redirect('/employee')  
  }else{
    const listCont = await pool.query(`DELETE FROM public.user WHERE name = '${req.params.name}'`)
    req.flash('msg','Data Employee berhasil di Hapus')  
    res.redirect('/employee')
  }
})

app.get('/attendance', async (req, res) => {
  //mengambil data dari db lalu mengirimkan datanya ke contact
    const listCont = await pool.query(`SELECT * FROM absence`)
    const cont = listCont.rows
    console.log(cont);
    res.render('attendance',{ 
      title:'Contact Page',
      cont,
      msg : req.flash('msg'),
      msg2 : req.flash('msg2')
   })
})
  
app.use('/', (req, res) => {
  res.status(404)
  res.send('Not found')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
  
})

const findContact = async (value) => {
  const name    = value.toLowerCase()
  const contact = await pool.query(`SELECT lower(name) FROM contact WHERE lower(name) ='${name}'`)
  return contact.rows[0]
}
const findEmployee = async (value) => {
  const name    = value.toLowerCase()
  const employee = await pool.query(`SELECT lower(name) FROM public.user WHERE lower(name) ='${name}'`)
  return employee.rows[0]
}
