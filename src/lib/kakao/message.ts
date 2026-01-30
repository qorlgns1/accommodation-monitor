import axios from 'axios';

import prisma from '@/lib/prisma';

interface SendMessageParams {
  userId: string;
  title: string;
  description: string;
  buttonText?: string;
  buttonUrl?: string;
}

/**
 * 카카오 access_token 갱신
 */
async function refreshKakaoToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kakaoRefreshToken: true },
  });

  if (!user?.kakaoRefreshToken) {
    console.error('카카오 refresh_token이 없습니다.');
    return null;
  }

  try {
    const response = await axios.post(
      'https://kauth.kakao.com/oauth/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.KAKAO_CLIENT_ID ?? '',
        client_secret: process.env.KAKAO_CLIENT_SECRET ?? '',
        refresh_token: user.kakaoRefreshToken,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // DB 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: {
        kakaoAccessToken: access_token,
        kakaoRefreshToken: refresh_token || user.kakaoRefreshToken,
        kakaoTokenExpiry: new Date(Date.now() + expires_in * 1000),
      },
    });

    console.log('✅ 카카오 토큰 갱신 완료');
    return access_token;
  } catch (error) {
    console.error('카카오 토큰 갱신 실패:', error);
    return null;
  }
}

/**
 * 유효한 access_token 가져오기
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      kakaoAccessToken: true,
      kakaoTokenExpiry: true,
    },
  });

  if (!user?.kakaoAccessToken) {
    console.error('카카오 토큰이 없습니다. 카카오 로그인이 필요합니다.');
    return null;
  }

  // 토큰 만료 확인 (5분 여유)
  if (user.kakaoTokenExpiry && new Date(user.kakaoTokenExpiry) < new Date(Date.now() + 5 * 60 * 1000)) {
    console.log('⚠️ 카카오 토큰 만료 임박. 갱신 중...');
    return refreshKakaoToken(userId);
  }

  return user.kakaoAccessToken;
}

/**
 * 카카오톡 나에게 보내기
 */
export async function sendKakaoMessage({
  userId,
  title,
  description,
  buttonText = '확인하기',
  buttonUrl = '',
}: SendMessageParams): Promise<boolean> {
  console.log('sendKakaoMessage', userId, title, description, buttonText, buttonUrl);
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    console.error('유효한 카카오 토큰이 없습니다.');
    return false;
  }

  try {
    const template = {
      object_type: 'text',
      text: `🏨 ${title}\n\n${description}`,
      link: {
        web_url: buttonUrl || 'https://www.airbnb.co.kr',
        mobile_web_url: buttonUrl || 'https://www.airbnb.co.kr',
      },
      button_title: buttonText,
    };

    const response = await axios.post(
      'https://kapi.kakao.com/v2/api/talk/memo/default/send',
      new URLSearchParams({
        template_object: JSON.stringify(template),
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (response.data.result_code === 0) {
      console.log('  ✅ 카카오톡 메시지 전송 성공');
      return true;
    } else {
      console.error('  ❌ 카카오톡 메시지 전송 실패:', response.data);
      return false;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 토큰 만료 시 갱신 후 재시도
      if (error.response?.status === 401) {
        console.log('⚠️ 토큰 만료. 갱신 후 재시도...');
        const newToken = await refreshKakaoToken(userId);
        if (newToken) {
          return sendKakaoMessage({
            userId,
            title,
            description,
            buttonText,
            buttonUrl,
          });
        }
      }
      console.error('  ❌ 카카오톡 메시지 전송 오류:', error.response?.data);
    } else {
      if (error instanceof Error) {
        console.error('  ❌ 카카오톡 메시지 전송 오류:', error.message);
      } else {
        console.error('  ❌ 카카오톡 메시지 전송 오류:', error);
      }
    }
    return false;
  }
}

/**
 * 숙소 예약 가능 알림 보내기
 */
export async function notifyAvailable(
  userId: string,
  accommodationName: string,
  checkIn: Date,
  checkOut: Date,
  price: string | null,
  checkUrl: string,
): Promise<boolean> {
  const title = '숙소 예약 가능! 🎉';

  const lines = [
    `📍 ${accommodationName}`,
    `📅 ${checkIn.toISOString().split('T')[0]} ~ ${checkOut.toISOString().split('T')[0]}`,
  ];

  if (price) {
    lines.push(`💰 ${price}`);
  }

  lines.push('');
  lines.push(`🔗 ${checkUrl}`);
  lines.push('');
  lines.push('지금 바로 확인하세요!');

  const description = lines.join('\n');

  return sendKakaoMessage({
    userId,
    title,
    description,
    buttonText: '예약하러 가기',
    buttonUrl: checkUrl,
  });
}
