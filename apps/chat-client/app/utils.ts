import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import { createTransport } from "nodemailer"
import { text, html } from "./components/emails/auth";
import { PrismaClient } from "database";

const prisma = new PrismaClient()
export const authOptions = {
    debug: true,
    providers: [
        EmailProvider({
          server: process.env.EMAIL_HOST == 'gmail' ? {
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASSWORD
            }
          }: {
            host: 'localhost',
            port: 7777,
            secure: false
          },
          from: process.env.EMAIL_USER,
          async sendVerificationRequest({
            identifier: email,
            url,
            provider: { server, from },
          }) {
              const { host } = new URL(url);
              const transport = createTransport(server);
              const result = await transport.sendMail({
                to: email,
                from,
                subject: `Sign in to ${host}`,
                text: text ({ url, host }),
                html: html({ url, host }),
              });
              const failed = result.rejected.concat(result.pending).filter(Boolean)
              if (failed.length) {
                throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`)
              } else console.info('Sent a verification email')
          },
        })
    ],
    adapter: PrismaAdapter(prisma),
    callbacks: {
        async signIn({ user }) {
            const allowedDomains = [
                'torus-digital.com',
                'ergonomicadesk.com',
                'nauralsleep.com'
            ]
            const isAllowedToSignIn = user.email && allowedDomains.includes(user.email.split('@').pop())
          if (isAllowedToSignIn) {
            return true
          } else {
            return '/error?' + new URLSearchParams({error: 'Unauthorized - Invalid email address'})
          }
        }
    },
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

const mondayAuth = async (mondayToken: string) => {
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



