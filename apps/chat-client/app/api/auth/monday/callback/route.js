import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import querystring from 'querystring'

// If you want to use environment variables, uncomment these lines
// var dotenv = require('dotenv');
// dotenv.config();

export async function GET(req) {
  console.log('REQUEST ', req)
  console.log('NEXT URL ', req.nextUrl.searchParams)
  // upon callback, your app first checks state parameter
  // if state is valid, we make a new request for access and refresh tokens

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  const cookieStore = cookies()
  var storedState = cookieStore.get('monday_auth_state');
  console.log('STORED STATE: ', storedState.value)
  console.log('STATE: ', state)

  if (state === null || state !== storedState.value) {
    redirect('/error')
  } else {
    cookieStore.delete('monday_auth_state')
    const authRequest = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        redirect_uri: process.env.REDIRECT_URI + "/api/auth/monday/callback",
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: code,
      }),
    };
    
    try {
      const response = await fetch('https://auth.monday.com/oauth2/token', authRequest);
      console.log('RESPONSE: ', response)
      console.log('RESPONSE STATUS: ', response.status)
      
      if (response.ok) {
        const jsonBody = await response.json();

        console.log('RESPONSE BODY ', jsonBody)
        const accessToken = jsonBody.access_token || null;
        //const refreshToken = jsonBody.refresh_token || null;
        const tokenType = jsonBody.token_type || null;
        const scope = jsonBody.scope || null;
        
        console.log('QUERY STRING ', querystring.stringify({
          status: 'success',
          access_token: accessToken,
          //refresh_token: refreshToken,
          token_type: tokenType,
          scope: scope,
        }))

        cookieStore.set('monday_auth_token', accessToken)
        return redirect("/");
      } else {
        console.error("Error fetching token:", await response.text());
        return redirect("/error?" + new URLSearchParams({
          status: 'failure',
        }));
      }
    } catch (error) {
      console.error("Error fetching token:", error);
      return redirect("/error?" + querystring.stringify({
        status: 'failure',
      }));
    }
  }
}