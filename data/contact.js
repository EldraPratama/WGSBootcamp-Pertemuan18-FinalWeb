const fs = require('fs');
const { exit } = require('process');
const validator = require('validator');


//Mengecek folder dan file
const dirPath = './data';
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
}

const dataPath = './data/contacts.json';
if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath,'[]','utf-8');
}

const loadContact = () => {
    const file      = fs.readFileSync('data/contacts.json','utf-8');
    const contacts  = JSON.parse(file);
    return contacts ;
}

//Menyimpan inputan
const SaveContact = (name,email,phone)=>{
    const contact  = {name,email,phone};
    const contacts = loadContact()
    contacts.push(contact);

    //validasi email dan no hp
    if (email) {
        cekEmail(email)
    }
    if (phone) {
        cekNomer(phone)
    }
   
    //Mengecek data duplicate 
    let duplicate = 0
    for (let i = 0; i < contacts.length ;i++){
        let dataJson  = contacts[i]   
        if (contact.name == dataJson.name ) { duplicate ++}     
    }

    if (duplicate > 1) {
        console.log("Nama sudah terdaftar");
    }else{       
        fs.writeFileSync('data/contacts.json',JSON.stringify(contacts));
        console.log('Terima Kasih sudah memasukkan data');
    }
 
}

//fungsi melihat daftar contact
const listContact = () => {
    const contacts = loadContact()
    return contacts
}

//fungsi melihat detail contact
const detailContact = (name) => {
    
    const contacts = loadContact()
    const detail = contacts.find(contact=>contact.name===name)
    
    console.log(detail);
    return detail

}

//Fungsi menghapus contact
const deleteContact = (name) => {
    // variabel found untuk mengecek ada tidaknya nama yang dicari
    let found = 0 
    const contacts = loadContact()
    contacts.forEach((contact,i) => {
        if (contact.name.toLowerCase() == name.toLowerCase() ) {
            contacts.splice(i,1)
            fs.writeFileSync('data/contacts.json',JSON.stringify(contacts));
            console.log("Data contact berhasil di hapus");
            found ++   
        }
    });

    cekPencarian(found,name)
}


// fungsi mengupdate contact
const updateContact = (name,new_name,email,phone) => {
    // variabel found untuk mengecek ada tidaknya nama yang dicari
    let found = 0 
    const contacts = loadContact()
    contacts.forEach((contact,i) => {
        if (contact.name.toLowerCase() == name.toLowerCase() ) {
           if (email) {
               cekEmail(email)
           }
           if (phone) {
               cekNomer(phone)
           }
           
           if (new_name) {contacts[i].name   = new_name}
           if (email)    {contacts[i].email  = email}
           if (phone)    {contacts[i].phone  = phone}
           
           //    new_name ? contacts[i].name   = new_name: contacts[i].name
           //    email    ? contacts[i].email  = email   : contacts[i].email
           //    phone    ? contacts[i].phone  = phone   : contacts[i].phone 
           found ++          
        }
    });  

    cekPencarian(found,name)

    fs.writeFileSync('data/contacts.json',JSON.stringify(contacts));
    console.log("Data contact berhasil di update");
}

//fungsi validasi Email
function cekEmail(email) {
    if (validator.isEmail(email)) {
        return false
    }else{
        console.log('Email belum valid')
        exit()
    }
}

//fungsi validasi Nomer hp
function cekNomer(phone) {
    if (validator.isMobilePhone(phone,'id-ID')) {
        return false          
    }else{
        console.log('Nomer belum valid')
        exit()
    }
}

//fungsi mengecek ada tidaknya nama yg dicari
function cekPencarian(found,name){
    if (found != 1) {
        console.log(`Nama ${name} tidak ditemukan`);
        exit()
    }
}

module.exports={SaveContact,listContact,detailContact,deleteContact,updateContact}
