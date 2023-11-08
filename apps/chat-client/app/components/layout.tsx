import { ChatBar } from "./chat-bar";
import { ContactInfo } from "./contact-info";
import { SideBar } from "./side-bar";
import { TopBar } from "./top-bar";

export function Layout({
    contactId,
    children,
  }: {
    contactId: string;
    children: React.ReactNode;
  }): JSX.Element {
    return (
        <div className="flex h-screen">
            <SideBar />
            <div className="bg-slate-400 flex flex-col flex-1">
                <TopBar />
                <ContactInfo contactId={contactId}/>
                <div className="flex-col flex-1 bg-slate-500 lg:h-screen lg:overflow-auto">
                    {children}
                </div>
                <ChatBar />
            </div>
        </div>
    );
  }
  