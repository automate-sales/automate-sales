import { PrismaClient } from 'database';
import Link from 'next/link';
import { SideBarContent } from './side-bar-content';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchAction } from '../_actions';
import { redirect } from 'next/navigation';

export async function SideBar({params, searchParams}: {params: any, searchParams: any}): Promise<JSX.Element> {
  console.log('SEARCH PARAMS ', searchParams)
  console.log('PARAMS ', params)
  const prisma = new PrismaClient();
  const query = 'query' in searchParams ? searchParams.query : null;
  const contacts = query ? 
  await prisma.contact.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          whatsapp_name: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          chats: {
            some: {
              OR: [
                {
                  text: {
                    contains: query,
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
                contains: query,
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
  }) :
  await prisma.contact.findMany({
    include: {
      chats: {
        take: 1,
        orderBy: {
          chatDate: 'desc',
        },
      },
    },
  });

  async function search(formData: FormData) {
    'use server'

    const queryString = String(formData.get('query'))
    console.log('Searching query: ', queryString)
    // mutate data
    const searchResults = await searchAction(queryString)
    console.log('SERACH RESULTS: ', searchResults)
    const baseRoute = params.id ? `/contacts/${params.id}` : '/'
    redirect(`${baseRoute}?${new URLSearchParams({query: queryString})}`)
    // revalidate cache
  }


  return (
    <div className="bg-slate-300 flex flex-col w-0 lg:w-1/4 px-2">
      <form className='h-14 w-full flex items-center' action={search}>
      <div className={`flex w-full items-center rounded-full px-2 py-1 transition-all duration-150 bg-gray-100`}>
          <input
              className="bg-transparent focus:outline-none w-full"
              placeholder="Search"
              type="text"
              name="query"
              title='query'
          />
          <button type="submit">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-600" />
          </button>
      </div>
      </form>
      <SideBarContent contacts={contacts} />
    </div>
  );
}
