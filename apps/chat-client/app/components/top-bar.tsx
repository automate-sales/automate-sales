import UserMenu from "./user-menu";

export function TopBar(): JSX.Element {
  return (
    <div className="flex justify-between bg-slate-300 h-12 items-center px-3">
        <div className="text-2xl font-bold">Chats</div>
        <UserMenu user={null} />
    </div>
  );
}
