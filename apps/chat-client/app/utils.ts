import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]/route';

/* import jwt from 'jsonwebtoken'

const verifyJwt =(sessionToken: string)=> {
    const decoded  = jwt.verify(sessionToken, process.env.CLIENT_SECRET)
    if(decoded && typeof decoded !== 'string' && decoded.dat){
        if(decoded.dat.client_id === process.env.CLIENT_ID){
            const userId = decoded.dat.user_id
            return { id: userId }
        } else return null
    } else return null
} */

async function mondayRequest(query: string) {
    return {data:{users: null}}
}

function getUserById(userId: any): string {
    return '';
}

const mondayAuth = async (mondayToken) => {
    /* const user = verifyJwt(mondayToken)
    if(user) {
        console.log('make a monday request')
        const userId = user.id
        const res = await mondayRequest(getUserById(userId))
        const userEmail = res?.data?.users[0]?.email ? res.data.users[0].email : null
        const userName = res?.data?.users[0]?.name ? res.data.users[0].name : null
        return {
            ...(userId && { id: Number(userId) }),
            ...(userName && { name: userName }),
            email: userEmail
        }
    } else */ return null
}

export const getCurrentUser = async(
    mondayToken:string|null=null,
) :  Promise<{
    name?: string;
    email?: string;
    image?: string;
} | null> => {
    try{
        if(mondayToken) return await mondayAuth(mondayToken)
        else {
            const session = await getServerSession(authOptions)
            if(session && session.user) {
                return session.user
            } else return null
        }
    } catch(err){
        console.error('ERROR: ', err)
        const error = err.message ? err.message : 'Error getting the current user'
        redirect('/error?' + new URLSearchParams({error: error}))
    }
}




