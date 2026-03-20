// src/app/api/todos/[id]/toggle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

async function verifyTokenAndGetUserId(request: NextRequest) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;

    // Get current task
    const task = await prisma.task.findFirst({
      where: {
        id,
        userId: auth.userId,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Toggle completion status
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        completed: !task.completed,
      },
    });

    const formattedTodo = {
      id: updatedTask.id,
      task: updatedTask.title,
      category: updatedTask.category || "General",
      priority: (updatedTask.priority as "high" | "medium" | "low") || "medium",
      dueDate: updatedTask.dueDate || "",
      notes: updatedTask.notes || "",
      completed: updatedTask.completed,
      createdAt: updatedTask.createdAt,
    };

    // Emit real-time update
    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit("task-synced", { 
        task: formattedTodo, 
        userId: auth.userId 
      });
    }

    return NextResponse.json({
      message: "Task toggled successfully",
      task: formattedTodo,
    });
  } catch (error) {
    console.error("Error toggling task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}