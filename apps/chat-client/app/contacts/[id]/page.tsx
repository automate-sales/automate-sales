import { ChatBar } from "../../components/chat-bar/chat-bar";
import { ChatHistory } from "../../components/chat-history";
import { ContactInfo } from "../../components/contact-info";
import Layout from "../../components/layout";
import { SideBar } from "../../components/side-bar";
import { TopBar } from "../../components/top-bar";

export default function Page({ params, searchParams }: { params: { id: string }, searchParams: any }): JSX.Element {
  return (
    <div className="flex h-screen">
      <SideBar params={params} searchParams={searchParams} />
      <div className="bg-slate-400 flex flex-col flex-1">
        <TopBar />
        <ContactInfo contactId={params.id} />
        
          <ChatHistory id={params.id} />

        <ChatBar contactId={params.id}/>
      </div>
    </div>
  );
}
