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


export async function getContacts(){
  return await prisma.contact.findMany({
    include: {
      chats: {
        take: 1,
        orderBy: {
          chatDate: 'desc',
        },
      },
    },
    orderBy: {
      last_chat_date: 'desc',
    }
  });
}

export async function getChatHistory(contact_id: string, skip?: number) {
  return await prisma.chat.findMany({
      where: {
          contact_id: contact_id
      },
      orderBy: {
          createdAt: 'desc',
      },
      take: 20,
      skip: skip ? skip : 0,
  });
}

export async function sendMessage(formData: FormData) {
  const endpoint = `${process.env.NEXT_PUBLIC_SERVER_URL}/whatsapp/message`
  console.log('SENDING MESSAGE TO ', endpoint, formData)
  try {
    const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
        // Do not manually set Content-Type here
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    console.log('RESPONSE ! ', res);
    return true;
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;  // Re-throw to handle it in the calling function
  }
};

export async function getTemplates() {
  return await prisma.template.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });
}