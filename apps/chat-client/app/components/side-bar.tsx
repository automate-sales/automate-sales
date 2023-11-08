import { PrismaClient } from 'database';
import Link from 'next/link';

export async function SideBar(): JSX.Element {
  const prisma = new PrismaClient();
  const contacts = await prisma.contact.findMany();

  return (
    <div className="bg-slate-300 flex flex-col w-0 lg:w-1/4">
      <div className='h-14'>Search</div>
      <div className='flex-1 flex-col gap-2'>
        {
          contacts.map((contact) => (
            <div className='p-2' key={contact.id}>
              <Link href={`/contacts/${contact.id}`}>
                <div className='p-2 hover:bg-slate-200'>
                  <div>{contact.name}</div>
                  <div>{contact.last_chat_text || '...'}</div>
                </div>
              </Link>
            </div>))
        }
      </div>
    </div>
  );
}
