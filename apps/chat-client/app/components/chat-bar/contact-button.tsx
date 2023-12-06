'use client'

import { UserIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

declare global {
    interface Navigator {
      contacts: any;
    }
  }

  interface Contact {
    name: string;
    email: string;
    tel: string;
  }

export function ContactButton(): JSX.Element {
    const [contact, setContact] = useState<Contact | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        "contacts" in navigator ? setIsSupported(true) : setIsSupported(false);
    })
  
    const handlePickContact = async () => {
      if (!isSupported) {
        return;
      }
  
      try {
        const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: false });
        setContact(contacts[0]); // Assuming the user picks one contact
        console.log('Contact picked:', contacts[0]);
      } catch (error) {
        console.error('Error picking contact:', error);
      }
    };
  
    return (
      <div>
        <button 
            className="flex items-center p-2 hover:bg-gray-100 w-full disabled:text-gray-400" 
            disabled={!isSupported}
            onClick={handlePickContact} 
            type="button"
            >
            <UserIcon className="h-6 w-6 mr-2" /> Contact
        </button>
        
  
        {contact && (
          <div>
            <p><strong>Name:</strong> {contact.name}</p>
            <p><strong>Email:</strong> {contact.email}</p>
            <p><strong>Phone:</strong> {contact.tel}</p>
          </div>
        )}
      </div>
    );
  };