import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import querystring from 'querystring'

export async function GET() {
  const state = process.env.RANDOM_STRING; // change this to a random string in your implementation
  cookies().set('monday_auth_state', state)
  console.log('COOKIES : ', cookies().getAll())
  console.log('REDIRECT URI: ', process.env.REDIRECT_URI + '/auth/callback')
  return redirect('https://auth.monday.com/oauth2/authorize?' +
    querystring.stringify({
      client_id: process.env.CLIENT_ID,
      redirect_uri: process.env.REDIRECT_URI + '/api/auth/monday/callback',
      state: state,
      scopes: "me:read boards:read"
    })
  )
}