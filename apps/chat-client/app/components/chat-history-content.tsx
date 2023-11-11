'use client'

import { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import { Chat } from "database";
import MessageBox from "./message-box";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8000';

export function ChatHistoryContent({ chats, contactId } : {chats: Chat[], contactId: string}): JSX.Element {
    const [futureChatHistory, setFutureChatHistory] = useState([]);
    const chatHistory = chats.concat(futureChatHistory);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);

    const scrollToBottom = () => {
        chatContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    useEffect(() => {
        scrollToBottom();
        const socket = io(SERVER_URL);  
        socket.on('new_message', (newMessage: Chat) => {
          if (newMessage.contact_id === contactId) {
            setFutureChatHistory(prevFutureChatHistory => [...prevFutureChatHistory, newMessage]);
          }
        });

        return () => {
          socket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!isUserScrolling) {
            scrollToBottom();
        }
    }, [futureChatHistory]);

    const handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
        setIsUserScrolling(!bottom);
    };

    return (
        <div className="p-3" ref={chatContainerRef} onScroll={handleScroll}>
            {chatHistory.map((chat, idx) => <MessageBox index={idx} key={chat.id} message={chat} />)}
        </div>
    );
}
