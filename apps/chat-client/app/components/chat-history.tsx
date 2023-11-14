import { PrismaClient } from "database";
import MessageBox from "./message-box";
import { ChatHistoryContent } from "./chat-history-content";
import { getChatHistory } from "../_actions";

export async function ChatHistory({ id } : {id: string}): Promise<JSX.Element> {
    const chats = await getChatHistory(id)
    return (
        <ChatHistoryContent chats={chats.reverse()} contactId={id}/>
    );
}