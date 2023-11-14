import NextAuth, { AuthOptions } from "next-auth"
import EmailProvider from "next-auth/providers/email";
import { createTransport } from "nodemailer"
import { text, html } from "../../../components/emails/auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "database";

const prisma = new PrismaClient()
export const authOptions: AuthOptions = {
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


const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }