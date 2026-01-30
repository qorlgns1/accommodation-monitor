'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { type ParsedAccommodationUrl, parseAccommodationUrl } from '@/lib/url-parser';

export default function NewAccommodationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedInfo, setParsedInfo] = useState<ParsedAccommodationUrl | null>(null);

  // 폼 상태
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);

  // URL 변경 시 자동 파싱
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!url) {
      setParsedInfo(null);
      return;
    }

    // 디바운스: 타이핑 완료 후 파싱
    const timer = setTimeout(() => {
      const parsed = parseAccommodationUrl(url);
      setParsedInfo(parsed);

      // 파싱된 값으로 폼 자동 채우기
      if (parsed.platform) {
        if (parsed.checkIn && !checkIn) setCheckIn(parsed.checkIn);
        if (parsed.checkOut && !checkOut) setCheckOut(parsed.checkOut);
        if (parsed.adults && adults === 2) setAdults(parsed.adults);
        if (parsed.name && !name) setName(parsed.name);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [url]);

  // "파싱된 정보로 채우기" 버튼
  function applyParsedInfo() {
    if (!parsedInfo) return;

    if (parsedInfo.checkIn) setCheckIn(parsedInfo.checkIn);
    if (parsedInfo.checkOut) setCheckOut(parsedInfo.checkOut);
    if (parsedInfo.adults) setAdults(parsedInfo.adults);
    if (parsedInfo.name) setName(parsedInfo.name);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // URL에서 플랫폼 자동 감지
    let platform = 'AIRBNB';
    if (url.includes('agoda')) {
      platform = 'AGODA';
    }

    // 기본 URL 사용 (쿼리 파라미터 제거된 버전)
    const baseUrl = parsedInfo?.baseUrl || url;

    const data = {
      name,
      platform,
      url: baseUrl,
      checkIn,
      checkOut,
      adults,
    };

    try {
      const res = await fetch('/api/accommodations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '숙소 추가에 실패했습니다');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

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

      <main className='max-w-2xl mx-auto px-4 py-8'>
        <div className='bg-white rounded-xl shadow-sm p-8'>
          <h1 className='text-2xl font-bold mb-6'>숙소 추가</h1>

          {error && <div className='bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6'>{error}</div>}

          <form
            onSubmit={handleSubmit}
            className='space-y-6'
          >
            {/* URL 입력 */}
            <div>
              <label
                htmlFor='url'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                숙소 URL *
              </label>
              <input
                type='url'
                id='url'
                name='url'
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder='https://www.airbnb.co.kr/rooms/12345678?check_in=...'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
              <p className='text-xs text-gray-500 mt-1'>
                Airbnb 또는 Agoda 숙소 페이지 URL을 붙여넣으세요. 날짜와 인원이 자동으로 입력됩니다.
              </p>

              {/* 파싱 결과 표시 */}
              {parsedInfo?.platform && (
                <div className='mt-3 p-3 bg-blue-50 rounded-lg'>
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-sm font-medium text-blue-800'>🔍 URL에서 정보를 찾았습니다</span>
                    <button
                      type='button'
                      onClick={applyParsedInfo}
                      className='text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors'
                    >
                      모두 적용
                    </button>
                  </div>
                  <div className='text-xs text-blue-700 space-y-1'>
                    <p>• 플랫폼: {parsedInfo.platform}</p>
                    {parsedInfo.name && <p>• 숙소명: {parsedInfo.name}</p>}
                    {parsedInfo.checkIn && <p>• 체크인: {parsedInfo.checkIn}</p>}
                    {parsedInfo.checkOut && <p>• 체크아웃: {parsedInfo.checkOut}</p>}
                    {parsedInfo.adults && <p>• 인원: {parsedInfo.adults}명</p>}
                  </div>
                </div>
              )}
            </div>

            {/* 숙소 이름 */}
            <div>
              <label
                htmlFor='name'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                숙소 이름 *
              </label>
              <input
                type='text'
                id='name'
                name='name'
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='예: 그린델발트 샬레'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>

            {/* 날짜 선택 */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label
                  htmlFor='checkIn'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  체크인 *
                </label>
                <input
                  type='date'
                  id='checkIn'
                  name='checkIn'
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                />
              </div>
              <div>
                <label
                  htmlFor='checkOut'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  체크아웃 *
                </label>
                <input
                  type='date'
                  id='checkOut'
                  name='checkOut'
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                />
              </div>
            </div>

            {/* 인원 */}
            <div>
              <label
                htmlFor='adults'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                인원
              </label>
              <input
                type='number'
                id='adults'
                name='adults'
                min='1'
                max='20'
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 2)}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              />
            </div>

            {/* 버튼 */}
            <div className='flex gap-4'>
              <button
                type='submit'
                disabled={loading}
                className='flex-1 bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50'
              >
                {loading ? '추가 중...' : '숙소 추가'}
              </button>
              <Link
                href='/dashboard'
                className='px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
              >
                취소
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
