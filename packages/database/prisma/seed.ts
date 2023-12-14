import dotenv from 'dotenv';
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}`});

import { existsSync, readFileSync } from 'fs';
import { createPublicBucket, uploadImageToS3, wipeS3Bucket } from "sdk/s3";
import {contacts, chats} from "test-data";
import { Chat, ChatStatus, ChatType, Direction, PrismaClient } from '@prisma/client'
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
      whatsapp_id: contact.phone_number,
      name: contact.name ? normalizeName(contact.name) : contact.phone_number,
      phone_number: phoneNumberObj?.e164Format,
      whatsapp_name: contact.name,
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
}

async function main() {
  try{
    if (NODE_ENV !== 'production') {
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