import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface UserWithRole {
  id: string;
  name: string | null;
  username: string;
  role: string;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { username },
          });

          if (!user || !user.password) return null;

          const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password,
          );

          if (!isPasswordCorrect) return null;

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
          } as UserWithRole;
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
        const userWithRole = user as UserWithRole;
        token.role = userWithRole.role;
        token.username = userWithRole.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined;
        session.user.username = token.username as string | undefined;
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // We use a dialog, but NextAuth expects a page
  },
});
