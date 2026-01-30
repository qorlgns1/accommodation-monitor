import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import KakaoProvider from 'next-auth/providers/kakao';

import { PrismaAdapter } from '@next-auth/prisma-adapter';

import prisma from '@/lib/prisma';

// import { validateWebEnv } from "@/lib/env";

// 웹 앱 시작 시 환경변수 검증
// if (typeof window === "undefined") {
//   validateWebEnv();
// }

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID ?? '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'profile_nickname profile_image account_email talk_message',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // 카카오 로그인 시 토큰을 DB에 저장
      if (account?.provider === 'kakao' && account.access_token) {
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          include: { user: true },
        });

        if (existingAccount) {
          await prisma.user.update({
            where: { id: existingAccount.userId },
            data: {
              kakaoAccessToken: account.access_token,
              kakaoRefreshToken: account.refresh_token,
              kakaoTokenExpiry: account.expires_at ? new Date(account.expires_at * 1000) : null,
            },
          });
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'database',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
