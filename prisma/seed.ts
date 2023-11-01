import dotenv from 'dotenv';
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}`});

import { Category, PrismaClient, Product, Subcategory } from "@prisma/client"
import { createPublicBucket, uploadImageFromURL, wipeS3Bucket } from "../src/utils/s3";

import categories from "../data/Category";
import subcategories from "../data/Subcategory";
import products from "../data/Product";
const prisma = new PrismaClient()

const bucketName = `${process.env.PROJECT_NAME}-media`
console.log('bucketName', bucketName)
const oldImgHost = 'https://d1tnzngtf1n4as.cloudfront.net/public'

async function wipeRelatedEntities() {
  console.log('Wiping related entities')
  //await prisma.order.deleteMany();
  //await prisma.cart.deleteMany();
  //await prisma.lead.deleteMany();
  //await prisma.user.deleteMany();
  //await prisma.session.deleteMany();
}

async function wipeProductsSubcategoriesAndCategories() {
  console.log('Wiping products')
  await prisma.product.deleteMany();
  console.log('Wiping subcategories')
  await prisma.subcategory.deleteMany();
  console.log('Wiping categories')
  await prisma.category.deleteMany();
  return true
}

async function seedCategories() {
  const createCategoryPromises = categories.map(async (c: Category ) => {
    //c.subcategories && delete c.subcategories;
    await prisma.category.create({ data: c });
    return Promise.all(c.images.map((i: string) => {
      return uploadImageFromURL(
        bucketName,
        `${oldImgHost}/categories/${i}`,
        `categories/${i}`
      );
    }));
  });
  return await Promise.all(createCategoryPromises);
}

async function seedSubcategories() {
  const createSubcategoryPromises = subcategories.map(async (s: Subcategory ) => {
    //s.category && delete s.category;
    await prisma.subcategory.create({ data: s });
    return Promise.all(s.images.map((i: string) => {
      return uploadImageFromURL(
        bucketName,
        `${oldImgHost}/subcategories/${i}`,
        `subcategories/${i}`
      );
    }));
  });
  return await Promise.all(createSubcategoryPromises);
}

async function seedProducts() {
  const createProductPromises = products.map(async (p: Product ) => {
    await prisma.product.create({ data: p });
    return Promise.all(p.images.map((i: string) => {
      return uploadImageFromURL(
        bucketName,
        `${oldImgHost}/products/${i}`,
        `products/${i}`
      );
    }));
  });
  return await Promise.all(createProductPromises);
}

async function wipeData() {
  //await prisma.cartItem.deleteMany();
  return await Promise.all([
    wipeRelatedEntities(),
    wipeProductsSubcategoriesAndCategories(),
    wipeS3Bucket(bucketName)
  ]);
}

async function seedData() {
  await seedCategories();
  await seedSubcategories();
  await seedProducts();
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