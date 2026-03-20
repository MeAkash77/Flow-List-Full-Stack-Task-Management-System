// src/app/api/automation/rules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
  }
  const token = authHeader.split(" ")[1];
  const decoded = verifyAccessToken(token);
  if (!decoded || typeof decoded === 'string' || !decoded.userId) {
    return { error: "Invalid token", status: 403 };
  }
  return { userId: decoded.userId };
}

// GET - Fetch user's automation rules
export async function GET(request: NextRequest) {
  const auth = await verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rules = await prisma.automationRule.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

// POST - Create a new automation rule
export async function POST(request: NextRequest) {
  const auth = await verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { name, triggerType, triggerValue, condition, actionType, actionValue, userId } = await request.json();

  if (userId !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!name || !triggerType || !actionType) {
    return NextResponse.json(
      { error: "Name, trigger type, and action type are required" },
      { status: 400 }
    );
  }

  const rule = await prisma.automationRule.create({
    data: {
      userId: auth.userId,
      name,
      triggerType,
      triggerValue,
      condition,
      actionType,
      actionValue,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}