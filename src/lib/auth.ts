import {betterAuth} from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import prisma from "./db"
 import { compare, hash } from "bcryptjs"
 
 export const auth = betterAuth({
  database: prismaAdapter(prisma,{
     provider:"postgresql"
  }),
  emailAndPassword:{
     enabled:true,
     autoSignIn:true,
     requireEmailVerification: true,
     password: {
       hash: async (password) => {
         return await hash(password, 12);
       },
       verify: async ({ hash: hashedPassword, password }) => {
         return await compare(password, hashedPassword);
       }
     }
  },
 trustedOrigins: [
    "https://nodebase.mayanksaraswal.in",
    "https://www.nodebase.mayanksaraswal.in",
    "https://nodebase-l8md4.ondigitalocean.app",
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
 baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://nodebase.mayanksaraswal.in",
 secret: process.env.BETTER_AUTH_SECRET
});