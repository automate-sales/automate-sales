import dotenv from 'dotenv';
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}`});

import { existsSync, readFileSync } from 'fs';
import { createPublicBucket, uploadImageToS3, wipeS3Bucket } from "sdk/s3";
import {contacts, chats} from "test-data";
import { Chat, ChatType, Direction, PrismaClient } from '@prisma/client'
import { v4 } from 'uuid';
import path from 'path'
import { normalizeName, normalizePhoneNumber } from 'sdk/utils';
import { cocoaToDate } from 'sdk/whatsapp';
const prisma = new PrismaClient()

const bucketName = `${process.env.PROJECT_NAME}-media`

async function wipeDatabase() {
  console.log('Wiping Data')
  await prisma.chat.deleteMany();
  await prisma.contact.deleteMany();
}

async function seedContacts() {
  for(let contact of contacts){
    const contactId = v4()
    const phoneNumberObj = normalizePhoneNumber(contact.phone_number)
    let newContact = {
      ...contact,
      id: contactId,
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
  let idx = 0
  for(let chat of chats){
    idx += 1
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
        contact_name,
        contact_phone, 
        ...validProps 
      } = chat
      let newChat = {
        ...validProps,
        id: chatId,
        name: `new ${chat.chat_type}`,
        contact_id: contact.id,
        phone_number: phoneNumberObj?.e164Format,
        chatDate: cocoaToDate(message_date),
        direction: chat.direction as Direction,
        chat_type: chat.chat_type as ChatType
      }
      // upload media to s3
      if(chat.media && existsSync(chat.media)){
        const file = readFileSync(chat.media)
        // upload file to s3
        const fileName = path.basename(chat.media)
        const key = `media/chats/${chatId}/${fileName}`
        newChat.media = key
        newChat.name = fileName
        await uploadImageToS3(bucketName, key, file)
      }
      await prisma.chat.create({
        data: newChat
      })
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