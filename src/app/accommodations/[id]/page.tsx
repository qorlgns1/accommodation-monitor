import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { LocalDateTime } from '@/components/LocalDateTime';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

import { DeleteButton, ToggleActiveButton } from './actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccommodationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    redirect('/login');
  }

  const accommodation = await prisma.accommodation.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      checkLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });

  if (!accommodation) {
    notFound();
  }

  const statusColors = {
    AVAILABLE: 'text-green-600 bg-green-100',
    UNAVAILABLE: 'text-red-600 bg-red-100',
    ERROR: 'text-yellow-600 bg-yellow-100',
    UNKNOWN: 'text-gray-600 bg-gray-100',
  };

  const statusText = {
    AVAILABLE: '예약 가능',
    UNAVAILABLE: '예약 불가',
    ERROR: '오류',
    UNKNOWN: '확인 중',
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 py-4'>
          <Link
            href='/dashboard'
            className='text-gray-500 hover:text-gray-700'
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 py-8'>
        {/* 숙소 정보 카드 */}
        <div className='bg-white rounded-xl shadow-sm p-8 mb-8'>
          <div className='flex items-start justify-between mb-6'>
            <div>
              <div className='flex items-center gap-3 mb-2'>
                <h1 className='text-2xl font-bold'>{accommodation.name}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[accommodation.lastStatus]}`}
                >
                  {statusText[accommodation.lastStatus]}
                </span>
              </div>
              <p className='text-gray-500'>{accommodation.platform}</p>
            </div>
            <div className='flex gap-2'>
              <ToggleActiveButton
                id={accommodation.id}
                isActive={accommodation.isActive}
              />
              <DeleteButton id={accommodation.id} />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div>
              <h3 className='text-sm text-gray-500 mb-1'>URL</h3>
              <a
                href={accommodation.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary-600 hover:underline break-all'
              >
                {accommodation.url}
              </a>
            </div>
            <div>
              <h3 className='text-sm text-gray-500 mb-1'>인원</h3>
              <p>{accommodation.adults}명</p>
            </div>
            <div>
              <h3 className='text-sm text-gray-500 mb-1'>체크인</h3>
              <p>{accommodation.checkIn.toISOString().split('T')[0]}</p>
            </div>
            <div>
              <h3 className='text-sm text-gray-500 mb-1'>체크아웃</h3>
              <p>{accommodation.checkOut.toISOString().split('T')[0]}</p>
            </div>
            {accommodation.lastPrice && (
              <div>
                <h3 className='text-sm text-gray-500 mb-1'>마지막 확인 가격</h3>
                <p className='text-lg font-semibold'>{accommodation.lastPrice}</p>
              </div>
            )}
            {accommodation.lastCheck && (
              <div>
                <h3 className='text-sm text-gray-500 mb-1'>마지막 체크</h3>
                <p>
                  <LocalDateTime date={accommodation.lastCheck} />
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 체크 로그 */}
        <div className='bg-white rounded-xl shadow-sm'>
          <div className='p-6 border-b'>
            <h2 className='text-lg font-semibold'>체크 로그</h2>
          </div>

          {accommodation.checkLogs.length === 0 ? (
            <div className='p-12 text-center text-gray-500'>아직 체크 로그가 없습니다</div>
          ) : (
            <div className='divide-y max-h-96 overflow-y-auto'>
              {accommodation.checkLogs.map((log) => (
                <div
                  key={log.id}
                  className='p-4 flex items-center gap-4'
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.status]}`}>
                    {statusText[log.status]}
                  </span>
                  <span className='flex-1 text-sm'>
                    {log.price && `${log.price}`}
                    {log.errorMessage && <span className='text-red-500 ml-2'>{log.errorMessage}</span>}
                  </span>
                  <LocalDateTime
                    date={log.createdAt}
                    className='text-xs text-gray-400'
                  />
                  {log.notificationSent && <span className='text-xs text-green-600'>📱</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
