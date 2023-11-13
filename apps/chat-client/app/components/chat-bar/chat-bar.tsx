'use client'

import React, { useEffect, useState } from 'react';
import { PaperClipIcon, FaceSmileIcon, CameraIcon, StarIcon, ChevronRightIcon, ArrowRightIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { MediaButton } from './media-button';
import { AudioButton } from './audio-button';
import { ContactButton } from './contact-button';
import { generateMessage } from 'sdk/whatsapp';

import { io, Socket} from "socket.io-client";
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8000';
let socket = null as Socket | null;

interface Template {
    name: string;
}

const templates: Template[] = [{ name: 'welcome' }, { name: 'hello' }];


function Spinner(): JSX.Element {
    return (
        <svg aria-hidden="true" className="w-6 h-6 text-gray-200 animate-spin fill-blue-600" fill="none" viewBox="0 0 100 101" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
        </svg>
    )
}


export function ChatBar({contactId}: {contactId: string}): JSX.Element {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [messageType, setMessageType] = useState<string>("text");
    const [typingUser, setTypingUser] = useState<string | null>(null);

    const handleCameraClick = (): void => { console.log('Camera clicked'); };
    const handleContactClick = (): void => { console.log('Contact clicked'); };
    const handleLocationClick = (): void => { console.log('Location clicked'); };
    const handleNewStickerClick = (): void => { console.log('New Sticker clicked'); };
    const handleEmojiClick = (): void => { console.log('Emoji clicked'); };

    const handleTemplateClick = (templateName: string): void => {
        console.log(`${templateName} template clicked`);
        setMessage(templateName);
    };

    useEffect(() => {
        socket = io(SERVER_URL);  
        const handleTyping = (data: { user: string; typing: boolean }) => {
            setTypingUser(data.typing ? data.user : null);
        };
        socket.on('typing', (data)=> handleTyping(data));
        return () => {
            socket.off('typing', handleTyping);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const currentMessage = e.target.value;
        setMessage(currentMessage);
        const isTyping = currentMessage.length > 0;
        socket.emit('typing', { user: 'YourUsername', typing: isTyping });
    };

    async function sendMessage(formData: FormData) {

        const endpoint = `${process.env.NEXT_PUBLIC_SERVER_URL}/whatsapp/message`

        setIsLoading(true);
        const res = await fetch(endpoint, {
            method: 'POST',
            body: formData
        })
        console.log(res)

        setIsLoading(false);
        setTypingUser(null);
        setMessage('');
    };

    return (
        <div className="flex-col bg-slate-200 pt-2 pb-5 px-2 gap-2">
            {/* Templates Menu */}
            <button className="flex items-center pb-2" onClick={() => { setIsTemplatesOpen(!isTemplatesOpen); }} type="button">
                <span>Templates</span>
                <ChevronRightIcon className={`h-5 w-5 transform ${isTemplatesOpen ? 'rotate-90' : ''} transition-transform duration-300`} />
            </button>
            <div className={`transition-[max-height] duration-500 ease-in-out ${isTemplatesOpen ? 'max-h-56' : 'max-h-0'} overflow-hidden`}>
                <div className='pt-1 pb-4 flex flex-wrap gap-2'>
                    {templates.map((template) => (
                        <button className="bg-gray-100 hover:bg-gray-200 text-center p-1 rounded-sm" key={template.name} onClick={() => handleTemplateClick(template.name)} type="button">
                            {template.name}
                        </button>
                    ))}
                </div>
            </div>
            {typingUser && (
                <div>{`user is typing...`}</div>
            )}
            {/* ChatBar */}
            <div className="flex items-center gap-2">
                {/* Plus icon and menu */}
                <div className="relative">
                    <button className="text-gray-600 hover:text-gray-800" onClick={() => { setIsMenuOpen(!isMenuOpen); }} type="button">
                        <PaperClipIcon className="h-6 w-6" />
                    </button>
                    <div className={`absolute bottom-10 -left-1 w-48 bg-white shadow-lg rounded-sm overflow-hidden transition-transform transform ${isMenuOpen ? 'scale-100' : 'scale-0'}`}>
                        {/* Menu Items */}
                        <MediaButton contactId={contactId} />
                        <button className="flex items-center p-2 hover:bg-gray-100 w-full" onClick={handleCameraClick} type="button">
                            <CameraIcon className="h-6 w-6 mr-2" /> Camera
                        </button>
                        <ContactButton />
                        <button className="flex items-center p-2 hover:bg-gray-100 w-full" onClick={handleLocationClick} type="button">
                            <MapPinIcon className="h-6 w-6 mr-2" /> Location
                        </button>
                        <button className="flex items-center p-2 hover:bg-gray-100 w-full" onClick={handleNewStickerClick} type="button">
                            <StarIcon className="h-6 w-6 mr-2" /> New Sticker
                        </button>
                    </div>
                </div>

                <form className="flex flex-1 items-center gap-2" action={sendMessage}>

                    {/* Input field with emoji icon */}
                    <div className={`flex-grow flex items-center rounded-full px-4 py-2 transition-all duration-150 ${isLoading ? 'bg-gray-400 text-gray-300' : 'bg-gray-100'}`}>
                        <input
                            className='hidden'
                            hidden
                            readOnly
                            type='text'
                            name='type'
                            title='type'
                            value={messageType}
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
                        <input
                            className="bg-transparent focus:outline-none w-full"
                            disabled={isLoading}
                            onChange={handleInputChange}
                            placeholder="Type a message"
                            type="text"
                            name="text"
                            title='text'
                            value={message}
                        />
                        <FaceSmileIcon className="h-6 w-6 text-gray-600 cursor-pointer" onClick={handleEmojiClick} />
                    </div>

                    {/* Conditional rendering for Submit/Microphone button */}
                    {message ? (
                        <button
                            className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300"
                            disabled={isLoading}
                            type="submit"
                        >
                            {isLoading ? (
                                <Spinner />
                            ) : (
                                <ArrowRightIcon className="h-5 w-5 text-white" />
                            )}
                        </button>
                    ) : (
                        <AudioButton />
                    )}
                </form>
            </div>
        </div>
    );
};