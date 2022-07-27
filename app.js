const express      = require('express')
var expressLayouts = require('express-ejs-layouts');
var morgan         = require('morgan')

const { body, validationResult,check } = require('express-validator');
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash')

const fs           = require('fs');
const contacts     = require('./data/contact.js');
const pool         = require("./db") 
const app          = express()
const port         = 3001
const bcrypt       = require('bcrypt')
var multer         = require('multer');
const { log } = require('console');

//untuk upload foto
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/upload')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({ storage: storage })

app.use(express.json())
//menjalankan morgan
app.use(morgan('dev'))

//menggunakan ejs
app.set('view engine','ejs')
app.use(expressLayouts);

//menggunakan layout yg ini
app.set('layout', 'layout/layout');

//Mengizinkan file gambar diakses
app.use("/public", express.static('public'))
app.use(express.urlencoded({extended:true}))

//konfigurasi flash
app.use(cookieParser('secret'))
const oneDay = 1000 * 60 * 60 * 24
app.use(
  session({
    secret : 'secret',
    resave : true,
    saveUninitialized : true ,
    cookie: { maxAge: oneDay }
  })
)
app.use(flash())

app.use( async (req, res, next) => {
  //membuat log aplikasi
  let name = 'anonim'
  let role = '-'
  // console.log('Time:', Date.now())
  if (req.session.name) { name = req.session.name }
  if (req.session.role) { role = req.session.role }

  const log = await pool.query(`INSERT INTO public.log(
     name, role, url, method, tanggal, waktu)
    VALUES ('${name}','${role}', '${req.url}', '${req.method}', now(), now())`)
  next()
})

//untuk halaman index
app.get('/', (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }

  res.render('index',
  {
    title:'Employee absence',
    msg  : req.flash('msg'),
    name : req.session.name,
    role : req.session.role
  })
})

//untuk halaman about
app.get('/about', (req, res) => {

    res.render('about',
    { 
      title:'About Page',
      name : req.session.name,
      role : req.session.role,
    })
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
      title:'Employee Absence',
      cont,
    })
  }
})

//menampilkan form tambah data
app.get('/contact/add', (req, res) => {
     res.render('add-employee',{ 
       title:'Employee Absence',
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
        title:'Employee Absence',
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
    req.flash('msg2',`Nama employee ${req.params.name} tidak tersedia`)
    res.redirect('/contact')  
  }else{
    //mulai proses edit
    const listCont = await pool.query(`SELECT * FROM contact WHERE name='${req.params.name}'`)
    const cont = listCont.rows[0]
    res.render('edit-contact',{ 
      title:'Employee Absence',
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
        title:'Employee Absence',
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
app.get('/login', async (req, res) => {
  // const password = await bcrypt.hash('eldra',10)
  // console.log(password);
  // console.log(morgan('dev'));
  if (typeof req.session.name != 'undefined') {
    res.redirect('/')
  }
  res.render('login',{ 
    title:'Employee Absence',
    msg  : req.flash('msg'),
    msg2 : req.flash('msg2')
 })
})

//proses login
app.post('/login',
 async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render('login',
      { 
        title:'Employee Absence',
        errors:errors.array(),
        cont:req.body,
      })    
    }else{
      // proses login
      const login = await pool.query(`SELECT * FROM public.user where username='${req.body.username}'`)
      console.log(login.rows[0])
      if (typeof login.rows[0] =='undefined') {
        req.flash('msg2','Username atau Password masih salah')
        res.redirect('/login')
      }else{
        const cek = await bcrypt.compare(req.body.password , login.rows[0].password)
        if (cek) {
          req.flash('msg','Login Sukses')
          req.session.name = login.rows[0].name 
          req.session.role = login.rows[0].role 
          res.redirect('/')
        }else{
          req.flash('msg2','Username atau Password masih salah')
          res.redirect('/login')
        }
      }
      



        // res.render('index',
        //   {
        //     title:'Employee absence',
        //     name : req.session.name,
        //     role : req.session.role,
        //     msg  : req.flash('msg'),
        //   })
      }
    }
)

app.get('/logout', (req, res) => {
  req.session.destroy(function(err) {
    if(err) {
      return next(err);
    } else {
      return res.redirect('/login');
    }
  })

})

// menampilkan profil employee
app.get('/profil', async(req, res) => {
    //mulai proses menampilkan detail
    if(!req.session.name){
      res.redirect('/login')
    }
    const employe = await pool.query(`SELECT * FROM public.user WHERE name='${req.session.name}'`)
    const cont = employe.rows[0]
    console.log(cont)
    res.render('profil',{ 
      title:'Employee Absence',
      cont,
      name : req.session.name,
      role : req.session.role,
      msg  : req.flash('msg')
    })
})

//proses update profil
app.post('/profil', upload.array('image'),
  //validasi input data
  body('new_name').custom( async (value, {req}) => {
    const duplikat = await findEmployee(value)
    console.log(duplikat);
    if (value !== req.body.name && duplikat ) {
      throw new Error('Nama sudah ada!')
    }
    return true
  }),
  check('phone','Nomer Telepon tidak valid').isMobilePhone('id-ID'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const employe = await pool.query(`SELECT * FROM public.user WHERE name='${req.session.name}'`)
      const cont = employe.rows[0]
      res.render('profil',{ 
        title:'Employee Absence',
        errors:errors.array(),
        name : req.session.name,
        role : req.session.role,
        cont ,
        msg  : req.flash('msg')
      })    
    }else{
        const user = await pool.query(`SELECT * FROM public.user where name='${req.session.name}'`)
        console.log(user.rows[0])
        
        const name     = req.body.name.toLowerCase()
        const new_name = req.body.new_name.toLowerCase()
        const phone    = req.body.phone
        const nik      = req.body.nik  

        if (!req.files[0]) {
          const newCont = await pool.query(`UPDATE public.user
           SET name='${new_name}', phone='${phone}', nik='${nik}' WHERE name='${name}'`)
        }else{
          if (user.rows[0].image != null) {
            if (fs.unlinkSync(`./public/upload/${user.rows[0].image}`)) {
              fs.unlinkSync(`./public/upload/${user.rows[0].image}`)   
            }
          }
          const image = req.files[0].filename 
          const newCont = await pool.query(`UPDATE public.user SET name='${new_name}', 
                  phone='${phone}', nik='${nik}', image='${image}' WHERE name='${name}'`)
        }

        req.flash('msg','Data Employee berhasil di Update')  
        res.redirect('/profil')
    }
})


//menampilkan halaman absen
app.get('/absen', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  const absence = await pool.query(`SELECT * FROM public.absence where name='${req.session.name}' and tgl='now()'`)
  // console.log(absence.rows)
  // console.log(absence.rows.length)
  let id 
  if (absence.rows.length != 0) {
    id =  absence.rows[0].id
  }
  res.render('absen',{ 
    title:'Employee Absence',
    id   : id,
    name :req.session.name,
    role :req.session.role,
    msg  : req.flash('msg'),
    absen:absence.rows[0]
 })
})

//proses melakukan absen
app.post('/absen',
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
        title:'Employee Absence',
        errors:errors.array(),
        cont:req.body,
        name:req.params.name,
      })    
    }else{
      // proses input jam masuk
        let name   = req.body.name
        let id     = req.body.id 
        let absen 
   
        if (name && id) {
          absen = await pool.query(`SELECT * FROM public.absence where name='${name}' and tgl='now()' and id='${id}'`)         
          // console.log(absen.rows);
          // console.log('pengecekan ke 1');
          
        }else{
          absen = await pool.query(`SELECT * FROM public.absence where name='${req.session.name}' and tgl='now()'`)
          // console.log(absen.rows);
          // console.log('pengecekan ke 2');
        }
         
        if (absen.rows.length == 0) {
            const absenin = await pool.query(`INSERT INTO public.absence(name, tgl, jam_masuk) VALUES ('${name}', now(),now() )`)
            console.log('jam masuk');
            req.flash('msg','Absen jam masuk berhasil')
            res.redirect('/absen')
        } else if (absen.jam_keluar == null ) {
            console.log('jam keluar');
            const absenout = await pool.query(`UPDATE public.absence SET  jam_keluar=now() WHERE id ='${id}'`)
            req.flash('msg','Absen jam keluar berhasil')
            res.redirect('/absen')
        } else {
          console.log('gagal');
        }
        
    }
})

//menampilkan form tambah data employee
app.get('/employee/add', (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  res.render('add-employee',{ 
    title:'Employee Absence',
    name : req.session.name,
    role : req.session.role,
 })
})
//menampilkan employee
app.get('/employee', async (req, res) => {
    if(!req.session.name){
      res.redirect('/login')
    }
    if (req.session.role != 'superadmin') {
      res.redirect('/')
    }
    //mengambil data dari db lalu mengirimkan datanya ke contact
    const listCont = await pool.query(`SELECT * FROM public.user where role='user'`)
    const cont = listCont.rows
    // console.log(cont);
    res.render('contact',{ 
      title:'Employee Absence',
      cont,
      msg : req.flash('msg'),
      msg2 : req.flash('msg2'),
      name : req.session.name,
      role : req.session.role,
   })
  //  console.log(morgan('dev'));
})

// menampilkan detail employee
app.get('/employee/:name', async(req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  //mengecek ada tidaknya data contact
  const contact = await findEmployee(req.params.name)
  if (!contact) {
    req.flash('msg2',`Nama contact ${req.params.name} tidak tersedia`)
    res.redirect('/employee')  
  }else{  
    //mulai proses menampilkan detail
    const employe = await pool.query(`SELECT * FROM public.user WHERE name='${req.params.name}'`)
    const cont = employe.rows[0]
    console.log(cont);
    res.render('detailContact',{ 
      title:'Employee Absence',
      cont,
      name : req.session.name,
      role : req.session.role,
    })
  }
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
      res.render('add-employee',
      { 
        title :'Employee Page',
        errors:errors.array(),
        cont  :req.body,
        msg   : req.flash('msg'),
        msg2  : req.flash('msg2'),
        name : req.session.name,
        role : req.session.role
      })    
    }else{
        const name     = req.body.name.toLowerCase()
        const password = await bcrypt.hash(req.body.password,10)
        const newAbsen = await pool.query(`INSERT INTO public.user (name, username, password, role)
          VALUES ('${name}','${req.body.username}', '${password}', '${req.body.role}')`)
     
        req.flash('msg','Data Employee berhasil di Tambah')
        res.redirect('/employee')
    }
})

// menghapus data 
app.get('/employee/delete/:name', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
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

//melihat riwayat absen dari sisi user biasa
app.get('/riwayat-absen', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'user') {
    res.redirect('/')
  }
  //mengambil data dari db lalu mengirimkan datanya ke contact
    const listCont = await pool.query(`SELECT * ,to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') as jam_kerja FROM absence where name='${req.session.name}' order by tgl desc`)
    const cont = listCont.rows
    res.render('riwayat-absen',{ 
      title:'Contact Page',
      cont,
      msg : req.flash('msg'),
      msg2 : req.flash('msg2'),
      name : req.session.name,
      role : req.session.role,
   })
})

//melihat kehadiran pegawai dari sisi admin
app.get('/attendance', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'superadmin') {
    res.redirect('/')
  }
  //mengambil data dari db lalu mengirimkan datanya ke contact
    const listCont = await pool.query(`SELECT *,to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') as jam_kerja FROM absence order by tgl desc, jam_masuk desc`)
    const cont = listCont.rows
    // console.log(cont);
    res.render('attendance',{ 
      title:'Contact Page',
      cont,
      msg : req.flash('msg'),
      msg2 : req.flash('msg2'),
      name : req.session.name,
      role : req.session.role,
   })
})

//melihat kehadiran pegawai dari sisi admin
app.post('/attendance', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'superadmin') {
    res.redirect('/')
  }
 
  let {tgl1,tgl2,jam_kerja,jumlah} = req.body
  let jam = jumlah

  if (jumlah!='') {
    if (jumlah>=10) {
      jumlah = jumlah +':00:00'
      console.log(jumlah);
    }else if(jumlah<10){
      jumlah = '0'+ jumlah + ':00:00'
      console.log(jumlah);
    }
  }

  let query = `SELECT * ,to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') as jam_kerja FROM absence 
        where tgl >='${tgl1}' and tgl <='${tgl2}'`
  
  if (jam_kerja =='kurang') {
    query = query + `and to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') <= '${jumlah}'`
  }else if (jam_kerja =='lebih') {
    query = query + `and to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') >= '${jumlah}' `
  }
  query = query + `order by tgl desc, jam_masuk desc`

  // const listCont = await pool.query(`SELECT *,to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') as jam_kerja FROM absence order by tgl desc`)
  const listCont = await pool.query(query)
  const cont = listCont.rows
  res.render('attendance',{ 
    title:'Contact Page',
    cont,
    tgl1,tgl2,jam_kerja,jumlah,jam,
    msg : req.flash('msg'),
    msg2 : req.flash('msg2'),
    name : req.session.name,
    role : req.session.role,
  })
})

app.get('/specifik-attendance', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'superadmin') {
    res.redirect('/')
  }
  //mengambil data dari db lalu mengirimkan datanya ke contact
    const list = await pool.query(`SELECT *  FROM public.absence`)
    const cont = list.rows
    // console.log(cont);
    // console.log(users);
    res.render('specifik-attendance',{ 
      title:'Contact Page', 
      msg : req.flash('msg'),
      msg2 : req.flash('msg2'),
      name : req.session.name,
      role : req.session.role,
      cont,
   })
})

app.post('/specifik-attendance', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'superadmin') {
    res.redirect('/')
  }
  //mengambil data dari db lalu mengirimkan datanya ke contact
    const listCont = await pool.query(`SELECT * ,to_char(jam_keluar-jam_masuk::time,'HH24:MI:ss') as jam_kerja FROM public.absence where name like '%${req.body.name}%'`)
    const cont = listCont.rows

    // console.log(cont);
    console.log(cont);
    res.render('specifik-attendance',{ 
      title:'Contact Page',
      pencarian: req.body.name,
      cont,
      msg : req.flash('msg'),
      msg2 : req.flash('msg2'),
      name : req.session.name,
      role : req.session.role,
   })
})

app.get('/log', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'superadmin') {
    res.redirect('/')
  }
  const log = await pool.query(`SELECT * FROM public.log order by tanggal desc , waktu desc `)
  const logs = log.rows
  // console.log(users);
  res.render('log',{ 
    title:'Contact Page',
    logs,
    cari : req.body.cari,
    msg : req.flash('msg'),
    msg2 : req.flash('msg2'),
    name : req.session.name,
    role : req.session.role,
   })
})

app.post('/log', async (req, res) => {
  if(!req.session.name){
    res.redirect('/login')
  }
  if (req.session.role != 'superadmin') {
    res.redirect('/')
  }
  //mengambil data dari db lalu mengirimkan datanya ke contact
  let cari = req.body.cari
  const log = await pool.query(`SELECT * FROM public.log
      where name like '%${cari}%' 
      or role like '%${cari}%' 
      or url like '%${cari}%'
      or method like '%${cari}%'
      order by tanggal desc , waktu desc`)
  const logs = log.rows
  // console.log(users);
  res.render('log',{ 
    title:'Contact Page',
    logs,cari,
    msg : req.flash('msg'),
    msg2 : req.flash('msg2'),
    name : req.session.name,
    role : req.session.role,
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
