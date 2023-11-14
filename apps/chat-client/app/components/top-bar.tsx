import { getCurrentUser } from "../utils";
import UserMenu from "./user-menu";

export async function TopBar({user}:{user: {
  name?: string;
  email?: string;
  image?: string;
}}): Promise<JSX.Element> {
  return (
    <div className="flex justify-between bg-slate-300 h-12 items-center px-3">
        <div className="text-2xl font-bold">Chats</div>
        <UserMenu user={user} />
    </div>
  );
}
