'use client'

import { Chat, Contact } from 'database';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDate } from 'sdk/utils';
import { io, Socket} from "socket.io-client";
import { getContacts } from '../_actions';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8000';
let socket = null as Socket | null;

type ContactWChats = Contact & {chats?: Chat[]};
export function SideBarContent({contacts, agent}: {contacts: ContactWChats[], agent:string}): JSX.Element {
  const [contactList, setContactList] = useState<ContactWChats[]>(contacts);
  //console.log('CONTACT LIST ', contacts)
  useEffect(() => {
    setContactList(contacts);
  }, [contacts]);
  
  useEffect(() => {
    socket = io(SERVER_URL);  
    socket.on('new_message', async () => {
      const updatedList = await getContacts()
      setContactList(updatedList);
    });
    return () => {
      socket?.disconnect();
    };
  }, []);  
  
  const getSummary =( chats: Chat[] | [] | null )=>{
        const text = chats && chats[0]?.text ? chats[0].text : '...';
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    }
    return (

      <div id='contact-list' className='flex-1 flex-col gap-2'>
        {
          contactList.map((contact) => (
            <div>
              <Link key={contact.id} id={contact.name?.replaceAll(' ', '-')} passHref href={`/contacts/${contact.id}`}>
                <div className='p-2 hover:bg-slate-200'>
                  <div className='flex justify-between'>
                    <div className='text-gray-900 text-sm'>{contact.name}</div>
                    <div className='text-gray-600 text-xs'>{formatDate(contact.chats && contact.chats[0]? contact.chats[0].chatDate : contact.updatedAt)}</div>
                  </div>
                  <div className='flex justify-between'>
                    <div className='text-xs text-gray-600'>{getSummary(contact.chats || [])}</div>
                    <div className='flex gap-2'>
                      { contact.chats && contact.chats[0] && 
                        contact.chats[0].direction === 'incoming' && 
                        !contact.chats[0].responded &&
                        (!contact.chats[0].seen_by || !(agent in Object(contact.chats[0].seen_by))) ?
                        <ExclamationCircleIcon className='text-red-500 h-4 w-4'/> : null}
                    </div>
                  </div>
                  
                </div>
              </Link>
            </div>))
        }
      </div>

  );
}
