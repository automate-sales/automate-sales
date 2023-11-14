// recieves a monday app Id and user Id
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

// If you want to use environment variables, uncomment these lines
// var dotenv = require('dotenv');
// dotenv.config();
export async function POST(request: NextRequest, response: NextResponse) {
    const req: {
        mondayToken: string,
        mondayUser: string,
        mondayBoard: string,
        mondayItem: string
    } = await request.json()
    if('mondayToken' in req){
        const { mondayToken, ...mondayContext } = req
        cookies().set('monday_auth_token', req.mondayToken, {httpOnly: true})
        cookies().set('monday_context', JSON.stringify(mondayContext), {httpOnly: true})
        return NextResponse.json({ success: true })
    } else return NextResponse.json({ error: 'Unauthorized' }, { status: 404 })
}