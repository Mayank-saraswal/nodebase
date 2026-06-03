import {betterAuth} from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import prisma from "./db"

export const auth = betterAuth({
 database: prismaAdapter(prisma,{
    provider:"postgresql"
 }),
 emailAndPassword:{
    enabled:true,
    autoSignIn:true,
    requireEmailVerification: true
 },
 trustedOrigins: [
    "https://nodebase.tech",
    "https://www.nodebase.tech",
    // DigitalOcean App Platform URLs are handled by nodebase.tech domain
    "https://vast-lemur-notable.ngrok-free.app",
    "http://localhost:3000"
 ],
 socialProviders:{
   github:{
      clientId:process.env.GITHUB_CLIENT_ID as string,
      clientSecret:process.env.GITHUB_CLIENT_SECRET as string
   },
   google:{
      clientId:process.env.GOOGLE_CLIENT_ID as string,
      clientSecret:process.env.GOOGLE_CLIENT_SECRET as string
   }
 },
 plugins:[],
 baseURL: process.env.BETTER_AUTH_URL,
 secret: process.env.BETTER_AUTH_SECRET
});