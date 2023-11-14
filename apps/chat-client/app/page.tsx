import { SideBar } from './components/side-bar';
import { getCurrentUser } from './utils';
import { redirect } from 'next/navigation';
import { TopBar } from './components/top-bar';

export default async function Page({params, searchParams}): Promise<JSX.Element> {
  const sessionToken = searchParams?.token ? searchParams.token : null
  const user = await getCurrentUser(sessionToken)
  if(!user) console.log('/error?' + new URLSearchParams({error: 'Unauthorized - Log in to continue'}))
  return (
    <div className="flex h-screen">
      <SideBar params={params} searchParams={searchParams} />
      <div className="bg-slate-400 flex flex-col flex-1">
        <TopBar user={user}/>
        <div className="flex w-full h-full justify-center">
          <div>Hola</div>
        </div>
      </div>
    </div>
  );
}