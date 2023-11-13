'use client'

import { PhotoIcon } from "@heroicons/react/24/outline";
import { useState, type FormEvent } from "react";
import { generateMessage } from "sdk/whatsapp";

export function MediaButton({contactId}: {contactId: string}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage(formData: FormData) {
    const endpoint = `${process.env.NEXT_PUBLIC_SERVER_URL}/whatsapp/message`
    setIsLoading(true);
    const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
    })
    console.log(res)

    setIsLoading(false);
    //setTypingUser(null);
    //setMessage('');
  };

  return (
    <form action={sendMessage}>
      <input 
          className='hidden'
          hidden
          readOnly
          type='text'
          name='type'
          title='type'
          value='media'
          disabled={isLoading}
      />
      <input
        className='hidden'
        hidden
        readOnly
        type='text'
        name='type'
        title='type'
        value='media'
    />
    <input
        className='hidden'
        hidden
        readOnly
        type='text'
        name='contact_id'
        title='contact_id'
        value={contactId}
    />
      <input className="hidden" id="file" name="file" type="file"/>
      <label htmlFor="file" className="flex cursor-pointer items-center p-2 hover:bg-gray-100 w-full">
        <PhotoIcon aria-label="Photo" className="h-6 w-6 mr-2"/> Media
      </label>
      <input type="submit" title="submit"/>
    </form>
  );
  }