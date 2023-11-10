import { Chat, Contact } from 'database';
import Link from 'next/link';
import { formatDate } from 'sdk/utils';

type ContactWChats = Contact & {chats?: Chat[]};
export function SideBarContent({contacts}: {contacts: ContactWChats[]}): JSX.Element {
    const getSummary =( chats: Chat[] | [] | null )=>{
        const text = chats[0]?.text ? chats[0].text : '...';
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    return (

      <div className='flex-1 flex-col gap-2'>
        {
          contacts.map((contact) => (

              <Link key={contact.id} href={`/contacts/${contact.id}`}>
                <div className='p-2 hover:bg-slate-200'>
                  <div className='flex justify-between'>
                    <div className='text-gray-900 text-sm'>{contact.name}</div>
                    <div className='text-gray-600 text-xs'>{formatDate(contact.chats[0]? contact.chats[0].chatDate : contact.updatedAt)}</div>
                    </div>
                  <div className='text-xs text-gray-600'>{getSummary(contact.chats)}</div>
                </div>
              </Link>))
        }
      </div>

  );
}
