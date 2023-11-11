import { PrismaClient } from "database";
import MessageBox from "./message-box";
import { ChatHistoryContent } from "./chat-history-content";

export async function ChatHistory({ id } : {id: string}): Promise<JSX.Element> {
    const prisma = new PrismaClient();
    const chats = await prisma.chat.findMany({
        where: {
            contact_id: id,
        },
        orderBy: {
            createdAt: 'asc',
        },
        take: 200,
    });
    return (
        <ChatHistoryContent chats={chats} contactId={id}/>
    );
}