import { PrismaClient } from 'database';
import { Main } from 'ui';
import { SideBar } from './components/side-bar';

export default async function Page(): Promise<JSX.Element> {
  const prisma = new PrismaClient();
  const data = await prisma.contact.findMany();

  return (
    <div className="flex h-screen">
      
      <SideBar />
      <div className="bg-slate-400 flex flex-col flex-1">
        <div className="flex bg-slate-300 h-14">
          sopa
        </div>
        <div className="flex-col flex-1 bg-slate-500"></div>
        <div className="flex bg-slate-300 h-24">
          Sopa
        </div>
      </div>
    </div>
  );
}