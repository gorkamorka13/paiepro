import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log("🔓 [Auth] Missing username or password");
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        console.log(`🔓 [Auth] Attempt for user: ${username}`);

        try {
          const user = await prisma.user.findUnique({
            where: { username },
          });

          if (!user) {
            console.log(`🔓 [Auth] User not found: ${username}`);
            return null;
          }

          if (!user.password) {
            console.log(`🔓 [Auth] User ${username} has no password in DB`);
            return null;
          }

          const isPasswordCorrect = await bcrypt.compare(password, user.password);
          console.log(`🔓 [Auth] Password match for ${username}: ${isPasswordCorrect}`);

          if (!isPasswordCorrect) return null;

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error("🔓 [Auth] Error during authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        session.user.id = token.sub!;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // We use a dialog, but NextAuth expects a page
  },
});
