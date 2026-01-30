'use client';

import { useState } from 'react';

import { signIn, signOut } from 'next-auth/react';

export function KakaoAlertBanner() {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className='mb-4 text-sm text-yellow-600 hover:underline'
      >
        ⚠️ 카카오톡 알림 설정 안내 보기
      </button>
    );
  }

  const handleKakaoLogin = async () => {
    // 현재 세션을 로그아웃하고 카카오로 다시 로그인
    await signOut({ redirect: false });
    await signIn('kakao', { callbackUrl: '/dashboard' });
  };

  return (
    <div className='mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4'>
      <div className='flex items-start justify-between'>
        <div className='flex gap-3'>
          <span className='text-2xl'>⚠️</span>
          <div>
            <h3 className='font-semibold text-yellow-800 mb-1'>카카오톡 알림을 받을 수 없습니다</h3>
            <p className='text-sm text-yellow-700 mb-3'>
              현재 Google 계정으로 로그인되어 있습니다. 숙소 예약 가능 알림을 카카오톡으로 받으려면 카카오 계정으로
              로그인해주세요.
            </p>
            <button
              onClick={handleKakaoLogin}
              className='inline-flex items-center gap-2 bg-[#FEE500] text-[#191919] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#FDD800] transition-colors'
            >
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M12 3C6.477 3 2 6.463 2 10.742c0 2.782 1.86 5.22 4.656 6.585-.145.525-.936 3.385-1.008 3.623 0 0-.02.168.089.233.109.065.236.031.236.031.313-.043 3.624-2.363 4.193-2.766.588.082 1.2.125 1.834.125 5.523 0 10-3.463 10-7.742S17.523 3 12 3z' />
              </svg>
              카카오로 다시 로그인
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className='text-yellow-600 hover:text-yellow-800 p-1'
          aria-label='닫기'
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M18 6L6 18M6 6l12 12' />
          </svg>
        </button>
      </div>
    </div>
  );
}
