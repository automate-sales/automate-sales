import { PrismaClient } from "database";
import MessageBox from "./message-box";

export async function ChatHistory({ id } : {id: string}): JSX.Element {
    const prisma = new PrismaClient();
    const chats = await prisma.chat.findMany({
        where: {
            contact_id: id,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });
    return (
        <div className="p-3">
            { chats.map((chat, idx) => <MessageBox index={idx} key={chat.id} message={chat} />)}
        </div>
    );
}