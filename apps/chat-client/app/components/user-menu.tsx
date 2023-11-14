'use client'

import { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

function UserMenu({ user }: { user: { 
    email?: string,
    name?: string,
    image?: string,
    id?: string,
} | null }) : JSX.Element {
	const [open, setOpen] = useState(false)
    const router = useRouter()
    
	return (
        <div>
            <button onClick={() => { setOpen(!open); }} type='button'>
                {
                    user ?
                        <span style={{ fontSize: '25px', fontWeight: 'bold' }}>{user.email[0].toUpperCase()}</span> :
                        <UserCircleIcon className='h-8 w-8' />
                }
            </button>
            <div className={`right-0 bg-white mt-1 p-2 ${open ? 'fixed' : 'hidden'}`}>
                {user ? <div>{user.name? user.name : user.email}</div> : null}
                {user?.id ? <button 
                    onClick={() => { router.push(`${process.env.NEXT_PUBLIC_MONDAY_URL}/users/${user.id}`); }} 
                    type='button'>{`monday: ${user.id}`}
                </button> : null}
                {user ?
                    <button onClick={() => { signOut({
                        redirect: true,
                        callbackUrl: '/'
                    })
                    }} title="Cerrar sesión" type='button'>Cerrar sesión</button> :
                    <button onClick={() => { router.push('/api/auth/signin'); }} type='button'>Iniciar sesión</button>
                }
            </div>
        </div>
	);
}
export default UserMenu

/* <Menu>
    {user && <MenuTitle caption={user.name? user.name : user.email} />}
    {user?.id && <MenuItem onClick={() => router.push(`${process.env.NEXT_PUBLIC_MONDAY_URL}/users/${user.id}`)} title={`monday: ${user.id}`} />}
    {user ?
        <MenuItem onClick={() => signOut()
            .then(() => console.info('Ha cerrado su sesión'))
            .catch(() => console.info('Error cerrando la sesión'))
        } title="Cerrar sesión" /> :
        <MenuItem onClick={() => router.push('/api/auth/signin')} title='Iniciar sesión' />
    }
</Menu> */