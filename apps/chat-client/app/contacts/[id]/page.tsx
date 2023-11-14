import { redirect } from "next/navigation";
import { ChatBar } from "../../components/chat-bar/chat-bar";
import { ChatHistory } from "../../components/chat-history";
import { ContactInfo } from "../../components/contact-info";
import { SideBar } from "../../components/side-bar";
import { TopBar } from "../../components/top-bar";
import { getCurrentUser } from "../../utils";

export default async function Page({ params, searchParams }: { params: { id: string }, searchParams: any }): JSX.Element {
  const sessionToken = searchParams?.token ? searchParams.token : null
  const user = await getCurrentUser(sessionToken)
  if(!user) return redirect('/error?' + new URLSearchParams({error: 'Unauthorized - Log in to continue'}))
  return (
    <div className="flex h-screen">
      <SideBar params={params} searchParams={searchParams} />
      <div className="bg-slate-400 flex flex-col flex-1">
        <TopBar user={user}/>
        <ContactInfo contactId={params.id} />
        
          <ChatHistory id={params.id} />

        <ChatBar contactId={params.id}/>
      </div>
    </div>
  );
}
