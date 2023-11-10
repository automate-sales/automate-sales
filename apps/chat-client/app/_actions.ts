'use server'

import { PrismaClient } from "database";
const prisma = new PrismaClient()

export async function searchAction(queryString: string) {
    const searchResults = await prisma.contact.findMany({
        where: {
          OR: [
            {
              name: {
                contains: queryString,
                mode: 'insensitive',
              },
            },
            {
              whatsapp_name: {
                contains: queryString,
                mode: 'insensitive',
              },
            },
            {
              chats: {
                some: {
                  OR: [
                    {
                      text: {
                        contains: queryString,
                        mode: 'insensitive',
                      },
                    }
                  ],
                },
              },
            },
          ],
        },
        include: {
          chats: {
            where: {
              OR: [
                {
                  text: {
                    contains: queryString,
                    mode: 'insensitive',
                  },
                }
              ],
            },
            take: 1,
            orderBy: {
              chatDate: 'desc',
            },
          },
        },
      });
    return searchResults
}


export async function getContactsAction(){
  return await prisma.contact.findMany({
    include: {
      chats: {
        take: 1,
        orderBy: {
          chatDate: 'desc',
        },
      },
    },
  });
}