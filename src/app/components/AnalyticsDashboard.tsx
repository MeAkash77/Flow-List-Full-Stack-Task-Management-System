// src/app/components/AnalyticsDashboard.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Stack,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  GetApp,
  Speed,
  EmojiEvents,
  CheckCircle,
  RadioButtonUnchecked,
  Flag,
  ShowChart,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { TodoItem } from '@/types/todo';

interface AnalyticsDashboardProps {
  tasks: TodoItem[];
  isDarkMode: boolean;
}

export default function AnalyticsDashboard({ tasks, isDarkMode }: AnalyticsDashboardProps) {
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  // Color palette for charts
  const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0', '#00bcd4'];

  // Calculate productivity score
  const productivityScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    
    const completed = tasks.filter(t => t.completed).length;
    const completionRate = (completed / tasks.length) * 100;
    
    // Safe date comparison
    const onTimeTasks = tasks.filter(t => {
      if (!t.completed || !t.dueDate) return true;
      const createdAt = t.createdAt ? new Date(t.createdAt) : new Date();
      const dueDate = new Date(t.dueDate);
      return createdAt <= dueDate;
    }).length;
    
    const onTimeRate = (onTimeTasks / (tasks.filter(t => t.completed).length || 1)) * 100;
    
    const consistencyScore = Math.min(100, (tasks.filter(t => t.completed).length / 10) * 100);
    
    return Math.round((completionRate * 0.5) + (onTimeRate * 0.3) + (consistencyScore * 0.2));
  }, [tasks]);

  // Get productivity badge
  const getProductivityBadge = () => {
    if (productivityScore >= 90) return { label: '🏆 Elite', color: '#ffd700' };
    if (productivityScore >= 70) return { label: '🔥 Pro', color: '#ff9800' };
    if (productivityScore >= 50) return { label: '📈 Rising', color: '#4caf50' };
    if (productivityScore >= 30) return { label: '🌱 Growing', color: '#2196f3' };
    return { label: '🚀 Starter', color: '#9e9e9e' };
  };

  // Prepare weekly data
  const weeklyData = useMemo(() => {
    const startDate = startOfWeek(new Date());
    const endDate = endOfWeek(new Date());
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayTasks = tasks.filter(t => {
        const createdAt = t.createdAt ? new Date(t.createdAt) : null;
        return createdAt && createdAt.toDateString() === day.toDateString();
      });
      const completedTasks = dayTasks.filter(t => t.completed);
      
      return {
        day: format(day, 'EEE'),
        created: dayTasks.length,
        completed: completedTasks.length,
        productivity: dayTasks.length ? (completedTasks.length / dayTasks.length) * 100 : 0,
      };
    });
  }, [tasks]);

  // Priority distribution data
  const priorityData = useMemo(() => {
    const high = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low = tasks.filter(t => t.priority === 'low').length;
    return [
      { name: 'High', value: high, color: '#f44336' },
      { name: 'Medium', value: medium, color: '#ff9800' },
      { name: 'Low', value: low, color: '#4caf50' },
    ];
  }, [tasks]);

  // Category distribution data
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};
    tasks.forEach(task => {
      categories[task.category] = (categories[task.category] || 0) + 1;
    });
    return Object.entries(categories)
      .map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [tasks]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dayTasks = tasks.filter(t => {
        const createdAt = t.createdAt ? new Date(t.createdAt) : null;
        return createdAt && createdAt.toDateString() === date.toDateString();
      });
      return {
        date: format(date, 'MM/dd'),
        completed: dayTasks.filter(t => t.completed).length,
        created: dayTasks.length,
      };
    });
    return last30Days;
  }, [tasks]);

  // Predicted completion time for next task
  const predictedCompletionTime = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return null;
    
    const avgTasksPerDay = completedTasks.length / 7;
    const hoursNeeded = Math.max(0.5, Math.round(3 / avgTasksPerDay));
    
    return hoursNeeded;
  }, [tasks]);

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      totalTasks: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      productivityScore,
      priorityDistribution: priorityData,
      categoryDistribution: categoryData,
      weeklyData,
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_report_${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportAnchorEl(null);
  };

  const badge = getProductivityBadge();

  const chartTextColor = isDarkMode ? '#e6f3ec' : '#0d2621';
  const chartGridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  return (
    <Box sx={{ py: 4 }}>
      {/* Header with Productivity Score */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ background: isDarkMode ? '#0f1f1a' : '#ffffff', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">Productivity Score</Typography>
                  <Typography variant="h2" fontWeight={800} sx={{ fontSize: '3rem' }}>
                    {productivityScore}
                  </Typography>
                  <Chip
                    label={badge.label}
                    sx={{
                      mt: 1,
                      backgroundColor: badge.color,
                      color: '#fff',
                      fontWeight: 'bold',
                    }}
                    size="small"
                  />
                </Box>
                <Speed sx={{ fontSize: 60, opacity: 0.5, color: badge.color }} />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={productivityScore}
                sx={{
                  mt: 2,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: badge.color,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ background: isDarkMode ? '#0f1f1a' : '#ffffff', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tasks.filter(t => t.completed).length} of {tasks.length} tasks
                  </Typography>
                </Box>
                <CheckCircle sx={{ fontSize: 50, opacity: 0.5, color: '#4caf50' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ background: isDarkMode ? '#0f1f1a' : '#ffffff', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">Today's Progress</Typography>
                  <Typography variant="h3" fontWeight={800}>
                    {tasks.filter(t => {
                      const today = new Date();
                      const createdAt = t.createdAt ? new Date(t.createdAt) : null;
                      return createdAt && createdAt.toDateString() === today.toDateString() && t.completed;
                    }).length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">tasks completed today</Typography>
                </Box>
                <EmojiEvents sx={{ fontSize: 50, opacity: 0.5, color: '#ff9800' }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Weekly Trend Chart */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: isDarkMode ? '#0f1f1a' : '#ffffff' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Weekly Activity</Typography>
          <Button
            size="small"
            startIcon={<GetApp />}
            onClick={(e) => setExportAnchorEl(e.currentTarget)}
          >
            Export Report
          </Button>
        </Stack>
        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => setExportAnchorEl(null)}
        >
          <MenuItem onClick={handleExport}>
            <GetApp sx={{ mr: 1 }} /> Export as JSON
          </MenuItem>
        </Menu>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={weeklyData}>
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis dataKey="day" stroke={chartTextColor} />
            <YAxis stroke={chartTextColor} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#1e2a24' : '#fff',
                border: 'none',
                borderRadius: '8px',
                color: chartTextColor,
              }}
            />
            <Legend />
            <Area type="monotone" dataKey="completed" stroke="#4caf50" fill="url(#colorCompleted)" name="Completed" />
            <Area type="monotone" dataKey="created" stroke="#2196f3" fill="url(#colorCreated)" name="Created" />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* Priority & Category Distribution */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, background: isDarkMode ? '#0f1f1a' : '#ffffff', height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Priority Distribution</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    const percentage = percent ? (percent * 100).toFixed(0) : '0';
                    return `${name} ${percentage}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, background: isDarkMode ? '#0f1f1a' : '#ffffff', height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Top Categories</Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis type="number" stroke={chartTextColor} />
                <YAxis type="category" dataKey="name" stroke={chartTextColor} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1e2a24' : '#fff',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="#4caf50">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* 30-Day Trend */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: isDarkMode ? '#0f1f1a' : '#ffffff' }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>30-Day Trend</Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
            <XAxis dataKey="date" stroke={chartTextColor} interval={6} />
            <YAxis stroke={chartTextColor} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#1e2a24' : '#fff',
                border: 'none',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="completed" stroke="#4caf50" strokeWidth={2} dot={false} name="Completed" />
            <Line type="monotone" dataKey="created" stroke="#ff9800" strokeWidth={2} dot={false} name="Created" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* AI Prediction Card */}
      {predictedCompletionTime && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <TrendingUp sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                🤖 AI Prediction
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Based on your patterns, you'll complete your next task in ~{predictedCompletionTime} hours
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                You're most productive on {' '}
                {(() => {
                  const bestIndex = weeklyData.reduce((best, day, i) => 
                    day.productivity > weeklyData[best]?.productivity ? i : best, 0
                  );
                  return weeklyData[bestIndex]?.day || 'Monday';
                })()}
                s! Keep up the momentum! 🚀
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}