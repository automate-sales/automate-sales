import { ChatHistoryContent } from "./chat-history-content";
import { getChatHistory } from "../_actions";
import { getCurrentUser } from "../utils";

export async function ChatHistory({ id } : {id: string}): Promise<JSX.Element> {
    const chats = await getChatHistory(id)
    const user = await getCurrentUser();
    return (
        <ChatHistoryContent chats={chats.reverse()} contactId={id} agent={user?.email || ''}/>
    );
}