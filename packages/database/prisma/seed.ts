import dotenv from 'dotenv';
dotenv.config();

import { existsSync, readFileSync, readdirSync } from 'fs';
import { createPublicBucket, uploadImageToS3, wipeS3Bucket } from "sdk/s3";
import {contacts, chats} from "test-data";
import { Chat, ChatSource, ChatStatus, ChatType, ContactSource, Direction, PrismaClient } from '@prisma/client'
import { v4 } from 'uuid';
import path from 'path'
import { getLinkProps, normalizeName, normalizePhoneNumber } from 'sdk/utils';
import { cocoaToDate } from 'sdk/whatsapp';
const prisma = new PrismaClient()

const bucketName = `${process.env.PROJECT_NAME}-media`
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL || 'http://localhost:9000'
const PROJECT_NAME = process.env.PROJECT_NAME || 'automation'

async function wipeDatabase() {
  console.log('Wiping Data')
  await prisma.chat.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUsers() {
  const users = [
    {
      name: "John Doe",
      email: "johndoe@doejohn.com"
    }
  ];
  for (let u of users) await prisma.user.create({data: u});
}

async function seedContacts() {
  for(let contact of contacts){
    const contactId = v4()
    const phoneNumberObj = normalizePhoneNumber(contact.phone_number)
    let newContact = {
      ...contact,
      id: contactId,
      contact_source: 'whatsapp' as ContactSource,
      source_id: contact.phone_number,
      source_name: contact.name,
      name: contact.name ? normalizeName(contact.name) : contact.phone_number,
      phone_number: phoneNumberObj?.e164Format,
      last_chat_date: cocoaToDate(contact.last_chat_date)
    }
    if(contact.profile_picture && existsSync(contact.profile_picture)){
      const file = readFileSync(contact.profile_picture)
      // upload file to s3
      const fileName = path.basename(contact.profile_picture)
      const key = `media/contacts/${contactId}/${fileName}`
      newContact.profile_picture = key
      await uploadImageToS3(bucketName, key, file)
      // create contact w/ s3 url
    }
    await prisma.contact.create({
      data: newContact
    })
  }
}

async function seedChats() {
  let idx = 1
  for(let chat of chats){
    const chatId = idx
    const phoneNumberObj = normalizePhoneNumber(chat.phone_number)

    // find contact by phone number
    const contact = await prisma.contact.findFirst({
      where: {
        phone_number: phoneNumberObj?.e164Format
      }
    })
    if(!contact || !contact?.id){ 
      console.log(`No contact found for ${chat.phone_number}`)
      continue
    } else{
    
      const { 
        mime_type, 
        message_date,
        ...validProps 
      } = chat
      let newChat = {
        ...validProps,
        chat_source: 'whatsapp' as ChatSource,
        name: `new ${chat.type}`,
        contact_id: contact.id,
        phone_number: phoneNumberObj?.e164Format,
        chatDate: cocoaToDate(message_date),
        direction: chat.direction as Direction,
        status: chat.direction == 'incoming' ? 'received' : 'delivered' as ChatStatus,
        type: chat.type as ChatType
      }
      if(chat.link) newChat.link = await getLinkProps(chat.link.url)
      // upload media to s3
      if(chat.media && existsSync(chat.media)){
        const file = readFileSync(chat.media)
        // upload file to s3
        const fileName = path.basename(chat.media)
        const key = `media/chats/${chatId}/${fileName}`
        newChat.media = `${MEDIA_BASE_URL}/${PROJECT_NAME}-media/${key}`
        newChat.name = fileName
        await uploadImageToS3(bucketName, key, file, mime_type)
      }
      await prisma.chat.create({
        data: newChat
      })
      idx+=1
    }
  }
}

const getMimeFromExtension =(extension: string)=> {
  switch(extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'mp4':
      return 'video/mp4'
    case 'pdf':
      return 'application/pdf'
    case 'csv':
      return 'text/csv'
    case 'webp':
      return 'image/webp'
    case 'ogg':
      return 'audio/ogg'
    default:
      return 'application/octet-stream'
  }
}

async function seedTestMedia(){
  const files = readdirSync(`${__dirname}/media`)
  for(let fileName of files) {
    console.log('FILENAME ', fileName)
    const filePath = `${__dirname}/media/${fileName}`;
    console.log('FILEPATH: ', filePath)
    const file = readFileSync(filePath);
    const fpath = `media/test/${fileName}`
    console.log('FILEPATH: ', fpath)
    //const mimeObj = await fileTypeFromBuffer(file)
    await uploadImageToS3(bucketName, fpath, file, getMimeFromExtension(fileName.split('.')[1]))
  }
}

async function wipeData() {
  return await Promise.all([
    wipeDatabase(),
    wipeS3Bucket(bucketName)
  ]);
}

async function seedData() {
  await seedUsers();
  await seedContacts();
  await seedChats();
  await seedTestMedia();
}

async function main() {
  try{
    console.log('SHEDZEER!! ')
    if (process.env.NODE_ENV !== 'production') {
      await createPublicBucket(bucketName)
    }
    await wipeData()
    await seedData()
  } catch(err) {
    console.error(err)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })