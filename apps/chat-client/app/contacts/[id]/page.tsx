import { ChatHistory } from "../../components/chat-history";
import { Layout } from "../../components/layout";

export default function Page({params}:{params: {id: string}}): JSX.Element {
  return (
    <Layout contactId={params.id}>
      <ChatHistory id={params.id}/>
    </Layout>
  );
}
