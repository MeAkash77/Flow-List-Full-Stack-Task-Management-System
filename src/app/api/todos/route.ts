import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// CREATE TODO
export async function POST(request: Request) {
  try {
    const { userId, task, category, priority, dueDate, notes } =
      await request.json();

    if (!userId || !task) {
      return NextResponse.json(
        { error: "User ID and task are required" },
        { status: 400 }
      );
    }

    // ✅ FIXED: Save all fields, not just title
    const newTodo = await prisma.task.create({
      data: {
        title: task,
        category: category || "General",
        priority: priority || "medium",
        dueDate: dueDate || null,
        notes: notes || "",
        userId,
        completed: false,
      },
    });

    // Format the response to match your TodoItem type
    const formattedTodo = {
      id: newTodo.id,
      task: newTodo.title,
      category: newTodo.category || "General",
      priority: (newTodo.priority as "high" | "medium" | "low") || "medium",
      dueDate: newTodo.dueDate || "",
      notes: newTodo.notes || "",
      completed: newTodo.completed,
      createdAt: newTodo.createdAt,
    };

    return NextResponse.json(formattedTodo, { status: 201 });
  } catch (error) {
    console.error("Error adding todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET TODOS
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const todos = await prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // ✅ FIXED: Format todos to match your TodoItem type
    const formattedTodos = todos.map(todo => ({
      id: todo.id,
      task: todo.title,
      category: todo.category || "General",
      priority: (todo.priority as "high" | "medium" | "low") || "medium",
      dueDate: todo.dueDate || "",
      notes: todo.notes || "",
      completed: todo.completed,
      createdAt: todo.createdAt,
    }));

    return NextResponse.json(formattedTodos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE TODO (toggle completed)
export async function PATCH(request: Request) {
  try {
    const { todoId, completed } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.task.update({
      where: { id: todoId },
      data: { completed },
    });

    const formattedTodo = {
      id: updated.id,
      task: updated.title,
      category: updated.category || "General",
      priority: (updated.priority as "high" | "medium" | "low") || "medium",
      dueDate: updated.dueDate || "",
      notes: updated.notes || "",
      completed: updated.completed,
      createdAt: updated.createdAt,
    };

    return NextResponse.json(formattedTodo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// UPDATE FULL TODO
export async function PUT(request: Request) {
  try {
    const { todoId, task, category, priority, dueDate, notes, completed } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    // ✅ FIXED: Update all fields
    const updated = await prisma.task.update({
      where: { id: todoId },
      data: {
        title: task,
        category: category,
        priority: priority,
        dueDate: dueDate,
        notes: notes,
        completed: completed,
      },
    });

    const formattedTodo = {
      id: updated.id,
      task: updated.title,
      category: updated.category || "General",
      priority: (updated.priority as "high" | "medium" | "low") || "medium",
      dueDate: updated.dueDate || "",
      notes: updated.notes || "",
      completed: updated.completed,
      createdAt: updated.createdAt,
    };

    return NextResponse.json(formattedTodo);
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE TODO
export async function DELETE(request: Request) {
  try {
    const { todoId } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    await prisma.task.delete({
      where: { id: todoId },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}