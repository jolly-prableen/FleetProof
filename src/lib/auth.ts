import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "./db";

const credsSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(100),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
        if (!user) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, branch: user.branch, language: user.language };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.branch = user.branch;
        token.language = user.language;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.branch = token.branch;
      session.user.language = token.language;
      return session;
    },
  },
};

/** Server-side guard: use at the top of a page or route handler. */
export async function requireRole(role: "DRIVER" | "BILLING") {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== role) redirect("/");
  return session.user;
}
