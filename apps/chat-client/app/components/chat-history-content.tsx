'use client'

import { useRef, useEffect, useState } from "react";
import { io, Socket} from "socket.io-client";
import { Chat } from "database";
import MessageBox from "./message-box";
import { getChatHistory } from "../_actions";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:8000';
let socket = null as Socket | null;

export function ChatHistoryContent({ chats, contactId } : {chats: Chat[], contactId: string}): JSX.Element {
    const [chatHistory, setChatHistory] = useState(chats);
    const cursor = chatHistory.length;
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatHistoryRef = useRef<HTMLDivElement>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);

    const scrollToBottom = () => {
        chatHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    useEffect(() => {
        socket = io(SERVER_URL);  
        scrollToBottom();
        socket.on('new_message', (newMessage: Chat) => {
          if (newMessage.contact_id === contactId) {
            setChatHistory(prevChatHistory => [...prevChatHistory, newMessage]);
          }
        });
        socket.on('status_update', (updatedMessage: Chat) => {
            if (updatedMessage.contact_id === contactId) {
                setChatHistory(prevChatHistory => {
                    const updatedChatHistory = prevChatHistory.map(chat => {
                        if (chat.id === updatedMessage.id) {
                            return updatedMessage;
                        }
                        return chat;
                    });
                    return updatedChatHistory;
                });
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
    }, [chatHistory]);

    console.log('CONTIANER REF ', chatContainerRef.current?.scrollTop, chatContainerRef.current?.scrollHeight, chatContainerRef.current?.clientHeight)
    console.log('HISTORY REF ', chatHistoryRef.current?.scrollTop, chatHistoryRef.current?.scrollHeight, chatHistoryRef.current?.clientHeight)
    const handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
        const top = e.target.scrollTop === 0;
        console.log(bottom, top);
        setIsUserScrolling(!bottom || top);
    };

    const getPreviousChats = async () => {
        if (chatContainerRef.current) {
            const prevScrollHeight = chatContainerRef.current.scrollHeight;
            const prevChats = await getChatHistory(contactId, cursor);
            setChatHistory(prevHistory => [...prevChats, ...prevHistory]);
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollTop + (chatContainerRef.current.scrollHeight - prevScrollHeight);
                }
            }, 10);
        }
    };

    return (
        <div ref={chatContainerRef} className="flex-col flex-1 bg-slate-500 lg:h-screen lg:overflow-auto" onScroll={handleScroll}>
        <div ref={chatHistoryRef} className="p-3">
            <button onClick={getPreviousChats}>get Previous Chats</button>
            {chatHistory.map((chat) => 
                <MessageBox key={`chat-${chat.id}`} message={chat} />
            )}
        </div>
        </div>
    );
}
