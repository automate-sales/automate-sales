import dotenv from 'dotenv';
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}`});

import { existsSync, readFileSync } from 'fs';
import { createPublicBucket, wipeS3Bucket } from "sdk/s3";
import {contacts, chats} from "test-data";
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const bucketName = `${process.env.PROJECT_NAME}-media`

async function wipeDatabase() {
  console.log('Wiping Data')
  await prisma.contact.deleteMany();
  await prisma.chat.deleteMany();
}

async function seedContacts() {
  for(let contact of contacts){
    console.log('CONATCT ', contact)
  }
}

async function seedChats() {
  for(let chat of chats){
    console.log('CHAT ', chat)
    if(chat.media && existsSync(chat.media)){
      const file = readFileSync(chat.media)
      console.log('FILE ', file)
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