// src/app/api/automation/rules/[id]/route.ts
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

// GET - Get a single rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const rule = await prisma.automationRule.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(rule);
}

// PUT - Update a rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { name, triggerType, triggerValue, condition, actionType, actionValue } = await request.json();

  const rule = await prisma.automationRule.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const updated = await prisma.automationRule.update({
    where: { id },
    data: { name, triggerType, triggerValue, condition, actionType, actionValue },
  });

  return NextResponse.json(updated);
}

// DELETE - Delete a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyToken(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const rule = await prisma.automationRule.findFirst({
    where: { id, userId: auth.userId },
  });

  if (!rule) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.automationRule.delete({ where: { id } });

  return NextResponse.json({ message: "Rule deleted" });
}