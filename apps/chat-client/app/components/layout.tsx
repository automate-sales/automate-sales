import { ChatBar } from "./chat-bar/chat-bar";
import { SideBar } from "./side-bar";
import { TopBar } from "./top-bar";

export default function Layout({
    children,
  }: {
    children: React.ReactNode;
  }): JSX.Element {
    return (
        <div className="flex h-screen">

            <div className="bg-slate-400 flex flex-col flex-1">
                <TopBar />
                  {children}
                <ChatBar />
            </div>
        </div>
    );
  }
  