// src/lib/geminiService.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini AI
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
let isAIEnabled = false;

if (apiKey && apiKey !== 'your_api_key_here' && apiKey !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    isAIEnabled = true;
    console.log('✅ Gemini AI initialized with model: gemini-2.5-flash');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini:', error);
  }
} else {
  console.log('⚠️ Gemini AI disabled - using smart fallback mode');
}

export interface AITaskSuggestion {
  title: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  notes?: string;
  subtasks?: string[];
}

export interface AIInsight {
  type: 'pattern' | 'recommendation' | 'alert' | 'motivation';
  message: string;
  confidence: number;
  icon?: string;
}

export class GeminiTaskAssistant {
  
  // ✅ FIXED: Use the correct model name from your available models
  private static getModel() {
    if (!genAI) return null;
    
    try {
      // Using the model that showed up in your list: "models/gemini-2.5-flash"
      // You can also try: "models/gemini-2.0-flash", "models/gemini-2.5-pro"
      return genAI.getGenerativeModel({ 
        model: "models/gemini-2.5-flash",  // ✅ Correct model name
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      });
    } catch (error) {
      console.warn('Failed to get AI model:', error);
      return null;
    }
  }

  // ✅ Parse natural language task with real AI
  static async parseTask(input: string): Promise<AITaskSuggestion> {
    // Smart fallback that works without AI
    const result: AITaskSuggestion = {
      title: input,
      priority: 'medium',
    };
    
    // Basic pattern matching (works even without AI)
    const today = new Date();
    if (input.match(/tomorrow/i)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.dueDate = tomorrow.toISOString().split('T')[0];
    } else if (input.match(/today/i)) {
      result.dueDate = today.toISOString().split('T')[0];
    } else if (input.match(/next week/i)) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      result.dueDate = nextWeek.toISOString().split('T')[0];
    }
    
    // Detect priority
    if (input.match(/urgent|asap|important|critical|high priority/i)) {
      result.priority = 'high';
    } else if (input.match(/low priority|whenever|no rush/i)) {
      result.priority = 'low';
    }
    
    // Simple category detection
    const categories = {
      Work: ['work', 'meeting', 'email', 'report', 'project'],
      Shopping: ['buy', 'shop', 'purchase', 'groceries'],
      Health: ['gym', 'workout', 'exercise', 'doctor', 'health'],
      Finance: ['pay', 'bill', 'invoice', 'bank', 'finance'],
      Learning: ['study', 'learn', 'course', 'read', 'research'],
      Chores: ['clean', 'laundry', 'dishes', 'house'],
      Family: ['family', 'kids', 'parent', 'call'],
      Goals: ['goal', 'dream', 'achieve', 'plan']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => input.toLowerCase().includes(kw))) {
        result.category = category;
        break;
      }
    }
    
    // Try AI enhancement if available
    if (isAIEnabled && genAI) {
      try {
        const model = this.getModel();
        if (model) {
          const prompt = `Parse this task: "${input}"
            Return JSON: { title, category, priority, dueDate, notes }
            Categories: Work, Personal, Shopping, Health, Finance, Learning, Chores, Family, Goals
            Priority: high/medium/low
            Due date: YYYY-MM-DD if mentioned
            Return ONLY valid JSON, no other text.`;

          const aiResult = await model.generateContent(prompt);
          const response = aiResult.response.text();
          const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const aiParsed = JSON.parse(cleaned);
          
          // Merge AI results with fallback (AI takes priority)
          return { ...result, ...aiParsed };
        }
      } catch (error) {
        console.warn('AI enhancement failed, using fallback');
      }
    }
    
    return result;
  }

  // ✅ Get smart suggestions with AI
  static async getSmartSuggestions(tasks: any[]): Promise<string[]> {
    const suggestions = [
      '🎯 Focus on your highest priority task first',
      '⏰ Break large tasks into 25-minute focused sessions',
      '✅ Complete one small task to build momentum',
      '📅 Schedule important tasks for your peak energy hours',
      '🔔 Set reminders for tasks with approaching deadlines'
    ];
    
    // Task-specific suggestions
    const highPriorityCount = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    if (highPriorityCount > 2) {
      suggestions.unshift(`⚠️ You have ${highPriorityCount} high-priority tasks. Focus on the most urgent one!`);
    }
    
    const overdueCount = tasks.filter(t => {
      if (!t.dueDate || t.completed) return false;
      return new Date(t.dueDate) < new Date();
    }).length;
    
    if (overdueCount > 0) {
      suggestions.unshift(`📅 ${overdueCount} task(s) overdue. Consider rescheduling or breaking them down.`);
    }
    
    // Try AI suggestions
    if (isAIEnabled && genAI && tasks.length > 0) {
      try {
        const model = this.getModel();
        if (model) {
          const recentTasks = tasks.slice(0, 5).map(t => t.task);
          const prompt = `Based on these recent tasks: ${JSON.stringify(recentTasks)}
            Suggest 3 new related tasks.
            Return ONLY a JSON array of strings, no other text.`;

          const result = await model.generateContent(prompt);
          const response = result.response.text();
          const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const aiSuggestions = JSON.parse(cleaned);
          
          if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
            return aiSuggestions;
          }
        }
      } catch (error) {
        console.warn('AI suggestions failed, using fallback');
      }
    }
    
    return suggestions.slice(0, 3);
  }

  // ✅ Get productivity insights
  static async getProductivityInsights(tasks: any[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total ? Math.round((completed / total) * 100) : 0;
    
    if (total === 0) {
      insights.push({
        type: 'recommendation',
        message: '📝 Start by adding your first task. Every journey begins with a single step!',
        confidence: 1.0,
        icon: '📝'
      });
    } else if (rate === 100) {
      insights.push({
        type: 'motivation',
        message: '🎉 PERFECT SCORE! You completed everything. Time to celebrate!',
        confidence: 1.0,
        icon: '🏆'
      });
    } else if (rate > 75) {
      insights.push({
        type: 'motivation',
        message: `🔥 Incredible progress! You've completed ${rate}% of your tasks.`,
        confidence: 0.95,
        icon: '🔥'
      });
    } else if (rate < 30 && total > 5) {
      insights.push({
        type: 'recommendation',
        message: '💡 Try the "eat the frog" method - tackle your hardest task first!',
        confidence: 0.85,
        icon: '🐸'
      });
    }
    
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    if (highPriority > 3) {
      insights.push({
        type: 'alert',
        message: `⚠️ ${highPriority} high-priority tasks pending. Focus on one at a time.`,
        confidence: 0.9,
        icon: '⚠️'
      });
    }
    
    const overdue = tasks.filter(t => t.dueDate && !t.completed && new Date(t.dueDate) < new Date()).length;
    if (overdue > 0) {
      insights.push({
        type: 'alert',
        message: `📅 ${overdue} overdue task(s). Consider rescheduling or breaking them down.`,
        confidence: 0.95,
        icon: '📅'
      });
    }
    
    if (insights.length === 0 && total > 0) {
      insights.push({
        type: 'motivation',
        message: `✨ You've completed ${completed} of ${total} tasks. Keep going!`,
        confidence: 0.9,
        icon: '✨'
      });
    }
    
    return insights;
  }

  static async generateSubtasks(task: string): Promise<string[]> {
    if (isAIEnabled && genAI) {
      try {
        const model = this.getModel();
        if (model) {
          const prompt = `Break down this task into 3-5 subtasks: "${task}"
            Return ONLY a JSON array of strings, no other text.`;

          const result = await model.generateContent(prompt);
          const response = result.response.text();
          const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (error) {
        console.warn('AI subtasks failed, using fallback');
      }
    }
    
    return [
      `📋 Plan and prepare for "${task}"`,
      '⚡ Execute the main work',
      '✅ Review and refine',
      '🎯 Finalize and deliver'
    ];
  }

  static async generateWeeklyReview(tasks: any[]): Promise<string> {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    
    if (total === 0) {
      return "✨ Start adding tasks to see your weekly review! Add your first task to begin tracking progress.";
    }
    
    const rate = Math.round((completed / total) * 100);
    
    if (isAIEnabled && genAI && total > 0) {
      try {
        const model = this.getModel();
        if (model) {
          const prompt = `Generate a friendly weekly review summary:
            Completed: ${completed} tasks
            Total: ${total} tasks
            Completion rate: ${rate}%
            Return a short, encouraging message.`;

          const result = await model.generateContent(prompt);
          return result.response.text().trim();
        }
      } catch (error) {
        console.warn('AI review failed, using fallback');
      }
    }
    
    if (rate === 100) {
      return "🏆 PERFECT WEEK! You completed every single task. That's extraordinary productivity! Treat yourself! 🎉";
    }
    
    if (rate >= 75) {
      return `🌟 Fantastic week! You completed ${completed} of ${total} tasks (${rate}%). You're crushing your goals! Keep this momentum going! 💪`;
    }
    
    if (rate >= 50) {
      return `📊 Good progress this week! You completed ${completed} of ${total} tasks (${rate}%). Next week, try breaking down larger tasks for even better results. Keep it up! 👍`;
    }
    
    return `📝 You completed ${completed} of ${total} tasks (${rate}%). Every task you complete is progress. Set small, achievable goals for next week to build momentum. You've got this! 💪`;
  }
}