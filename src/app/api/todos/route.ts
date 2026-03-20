// src/app/api/todos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/auth";

// Helper function to verify token and get userId
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

// CREATE TODO
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { task, category, priority, dueDate, notes } = await request.json();

    if (!task) {
      return NextResponse.json(
        { error: "Task is required" },
        { status: 400 }
      );
    }

    const newTodo = await prisma.task.create({
      data: {
        title: task,
        category: category || "General",
        priority: priority || "medium",
        dueDate: dueDate || null,
        notes: notes || "",
        userId: auth.userId,
        completed: false,
      },
    });

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

    // Emit real-time update
    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit("task-created-synced", { 
        task: formattedTodo, 
        userId: auth.userId 
      });
    }

    return NextResponse.json(formattedTodo, { status: 201 });
  } catch (error) {
    console.error("Error adding todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET TODOS WITH PAGINATION, SEARCH, AND FILTERS
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    // Search parameter
    const search = searchParams.get("search") || "";
    
    // Filters
    const statusFilter = searchParams.get("status"); // "active", "completed"
    const categoryFilter = searchParams.get("category"); // category name or "all"
    const priorityFilter = searchParams.get("priority"); // "high", "medium", "low"

    // Build where clause
    const whereClause: any = { userId: auth.userId };
    
    // Add search filter (case insensitive)
    if (search) {
      whereClause.title = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    // Add status filter
    if (statusFilter === "active") {
      whereClause.completed = false;
    } else if (statusFilter === "completed") {
      whereClause.completed = true;
    }
    
    // Add category filter
    if (categoryFilter && categoryFilter !== "all" && categoryFilter !== "today") {
      whereClause.category = categoryFilter;
    }
    
    // Add priority filter
    if (priorityFilter && priorityFilter !== "all") {
      whereClause.priority = priorityFilter;
    }

    // Execute queries in parallel
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.task.count({
        where: whereClause
      })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Format tasks
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      task: task.title,
      category: task.category || "General",
      priority: (task.priority as "high" | "medium" | "low") || "medium",
      dueDate: task.dueDate || "",
      notes: task.notes || "",
      completed: task.completed,
      createdAt: task.createdAt,
    }));

    return NextResponse.json({
      tasks: formattedTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      }
    });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json({ 
      tasks: [], 
      pagination: { 
        page: 1, 
        limit: 10, 
        total: 0, 
        totalPages: 0,
        hasNext: false, 
        hasPrev: false 
      } 
    });
  }
}

// UPDATE TODO (toggle completed)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { todoId, completed } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    // Verify the todo belongs to the user
    const existingTodo = await prisma.task.findFirst({
      where: { 
        id: todoId,
        userId: auth.userId
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.task.update({
      where: { id: todoId },
      data: { completed: completed !== undefined ? completed : !existingTodo.completed },
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

    // Emit real-time update
    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit("task-synced", { 
        task: formattedTodo, 
        userId: auth.userId 
      });
    }

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
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { todoId, task, category, priority, dueDate, notes, completed } = await request.json();

    if (!todoId || !task) {
      return NextResponse.json(
        { error: "Todo ID and task are required" },
        { status: 400 }
      );
    }

    const existingTodo = await prisma.task.findFirst({
      where: { 
        id: todoId,
        userId: auth.userId
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

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

    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit("task-synced", { 
        task: formattedTodo, 
        userId: auth.userId 
      });
    }

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
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyTokenAndGetUserId(request);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { todoId } = await request.json();

    if (!todoId) {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    const existingTodo = await prisma.task.findFirst({
      where: { 
        id: todoId,
        userId: auth.userId
      }
    });

    if (!existingTodo) {
      return NextResponse.json(
        { error: "Todo not found" },
        { status: 404 }
      );
    }

    await prisma.task.delete({
      where: { id: todoId },
    });

    if (typeof global !== 'undefined' && (global as any).io) {
      (global as any).io.emit("task-deleted-synced", { 
        taskId: todoId, 
        userId: auth.userId 
      });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}