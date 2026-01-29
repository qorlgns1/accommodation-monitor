import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createAccommodationSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  platform: z.enum(["AIRBNB", "AGODA"]),
  url: z.string().url("올바른 URL을 입력해주세요"),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  adults: z.number().min(1).max(20).default(2),
});

// GET: 숙소 목록 조회
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accommodations = await prisma.accommodation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accommodations);
}

// POST: 숙소 생성
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createAccommodationSchema.parse(body);

    // URL에서 플랫폼 자동 감지
    let platform = data.platform;
    if (data.url.includes("airbnb")) {
      platform = "AIRBNB";
    } else if (data.url.includes("agoda")) {
      platform = "AGODA";
    }

    const accommodation = await prisma.accommodation.create({
      data: {
        userId: session.user.id,
        name: data.name,
        platform,
        url: data.url,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        adults: data.adults,
      },
    });

    return NextResponse.json(accommodation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("숙소 생성 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
