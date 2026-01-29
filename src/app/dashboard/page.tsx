import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { LogoutButton } from "./logout-button";
import { KakaoAlertBanner } from "./kakao-alert-banner";
import { LocalDateTime } from "@/components/LocalDateTime";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // 사용자 정보 조회 (카카오 토큰 여부 확인)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      kakaoAccessToken: true,
    },
  });

  const hasKakaoToken = !!user?.kakaoAccessToken;

  // 사용자의 숙소 목록 조회
  const accommodations = await prisma.accommodation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // 최근 로그 조회
  const recentLogs = await prisma.checkLog.findMany({
    where: { userId: session.user.id },
    include: { accommodation: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const statusColors = {
    AVAILABLE: "text-green-600 bg-green-100",
    UNAVAILABLE: "text-red-600 bg-red-100",
    ERROR: "text-yellow-600 bg-yellow-100",
    UNKNOWN: "text-gray-600 bg-gray-100",
  };

  const statusText = {
    AVAILABLE: "예약 가능",
    UNAVAILABLE: "예약 불가",
    ERROR: "오류",
    UNKNOWN: "확인 중",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">🏨 숙소 모니터링</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{session.user.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* 카카오톡 알림 배너 (Google 로그인 사용자에게만 표시) */}
        {!hasKakaoToken && <KakaoAlertBanner />}

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-500 text-sm mb-1">등록된 숙소</h3>
            <p className="text-3xl font-bold">{accommodations.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-500 text-sm mb-1">모니터링 중</h3>
            <p className="text-3xl font-bold text-green-600">
              {accommodations.filter((a) => a.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-500 text-sm mb-1">예약 가능</h3>
            <p className="text-3xl font-bold text-primary-600">
              {
                accommodations.filter((a) => a.lastStatus === "AVAILABLE")
                  .length
              }
            </p>
          </div>
        </div>

        {/* 숙소 목록 */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">내 숙소</h2>
            <Link
              href="/accommodations/new"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              + 숙소 추가
            </Link>
          </div>

          {accommodations.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p className="mb-4">등록된 숙소가 없습니다</p>
              <Link
                href="/accommodations/new"
                className="text-primary-600 hover:underline"
              >
                첫 번째 숙소를 등록해보세요
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {accommodations.map((acc) => (
                <div
                  key={acc.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium">{acc.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium break-keep text-center ${statusColors[acc.lastStatus]}`}
                      >
                        {statusText[acc.lastStatus]}
                      </span>
                      {!acc.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          일시정지
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {acc.platform} · {acc.checkIn.toISOString().split("T")[0]}{" "}
                      ~ {acc.checkOut.toISOString().split("T")[0]}
                      {acc.lastPrice && ` · ${acc.lastPrice}`}
                    </p>
                    {acc.lastCheck && (
                      <p className="text-xs text-gray-400 mt-1">
                        마지막 체크: <LocalDateTime date={acc.lastCheck} />
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/accommodations/${acc.id}`}
                    className="text-primary-600 hover:underline text-sm"
                  >
                    상세보기
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 최근 로그 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">최근 체크 로그</h2>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              아직 체크 로그가 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {recentLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center gap-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[log.status]}`}
                  >
                    {statusText[log.status]}
                  </span>
                  <span className="flex-1 text-sm">
                    {log.accommodation.name}
                    {log.price && ` · ${log.price}`}
                  </span>
                  <LocalDateTime
                    date={log.createdAt}
                    className="text-xs text-gray-400"
                  />
                  {log.notificationSent && (
                    <span className="text-xs text-green-600">
                      📱 알림 전송됨
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
