import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // 로그인된 경우 대시보드로 리다이렉트
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className='min-h-screen flex flex-col items-center justify-center p-8'>
      <div className='max-w-2xl text-center'>
        <h1 className='text-4xl font-bold mb-4'>🏨 숙소 모니터링</h1>
        <p className='text-xl text-gray-600 mb-8'>
          Airbnb, Agoda 숙소의 예약 가능 여부를 모니터링하고
          <br />
          카카오톡으로 알림을 받으세요
        </p>

        <div className='space-y-4 mb-12'>
          <div className='flex items-center justify-center gap-2 text-gray-600'>
            <span className='text-2xl'>✅</span>
            <span>인기 숙소 취소 건 알림</span>
          </div>
          <div className='flex items-center justify-center gap-2 text-gray-600'>
            <span className='text-2xl'>✅</span>
            <span>10분마다 자동 체크</span>
          </div>
          <div className='flex items-center justify-center gap-2 text-gray-600'>
            <span className='text-2xl'>✅</span>
            <span>카카오톡으로 즉시 알림</span>
          </div>
        </div>

        <Link
          href='/login'
          className='inline-block bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors'
        >
          시작하기
        </Link>
      </div>
    </main>
  );
}
