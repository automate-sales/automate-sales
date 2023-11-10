import { ChatHistory } from "../../components/chat-history";
import { ContactInfo } from "../../components/contact-info";
import Layout from "../../components/layout";

export default function Page({params}:{params: {id: string}}): JSX.Element {
  return (
    <Layout>
      <ContactInfo contactId={params.id}/>
      <div className="flex-col flex-1 bg-slate-500 lg:h-screen lg:overflow-auto">
        <ChatHistory id={params.id}/>
      </div>
    </Layout>
  );
}
