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
const SaveContact = (dataInput)=>{
    const contact  = dataInput;
    const contacts = loadContact()
    contacts.push(contact);
      
    fs.writeFileSync('data/contacts.json',JSON.stringify(contacts));

    
}

//fungsi mengecek data duplikat
const cekDuplikat = (name) => {
    const contacts = loadContact()
    return contacts.find((contact) => contact.name === name)
}

//fungsi mencari kontak
const findContact = (name) => {
    const contacts = loadContact()
    const contact = contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase())
    return contact
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
    const contacts = loadContact()
    contacts.forEach((contact,i) => {
        if (contact.name == name ) {
            contacts.splice(i,1)
            fs.writeFileSync('data/contacts.json',JSON.stringify(contacts));
        }
    });

}


// fungsi mengupdate contact
const updateContact = (dataUpdate) => {
    const contacts = loadContact()
    contacts.forEach((contact,i) => {     
        if (contact.name.toLowerCase() == dataUpdate.name.toLowerCase() ) {       
           if (dataUpdate.new_name) {contacts[i].name   = dataUpdate.new_name}
           if (dataUpdate.email)    {contacts[i].email  = dataUpdate.email}
           if (dataUpdate.phone)    {contacts[i].phone  = dataUpdate.phone}
        }
    });  
    fs.writeFileSync('data/contacts.json',JSON.stringify(contacts));
    console.log("Data contact berhasil di update");

    // v2
    // const filtered = contacts.filter(
    //     (contact) => contact.name.toLowerCase() !== dataUpdate.
    //     name.toLowerCase()
    // )
    // delete dataUpdate.name
    // filtered.push(dataUpdate)
    // SaveContact(filtered)
}


//fungsi mengecek ada tidaknya nama yg dicari
function cekPencarian(found,name){
    if (found != 1) {
        console.log(`Nama ${name} tidak ditemukan`);
        exit()
    }
}

module.exports={SaveContact,listContact,detailContact,deleteContact,updateContact,cekDuplikat,findContact}
