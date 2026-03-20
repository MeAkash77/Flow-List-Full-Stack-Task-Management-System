// src/app/insights/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Paper,
  Grid,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Divider,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Insights,
  CheckCircle,
  Flag,
  CalendarMonth,
  Refresh,
  Download,
  Description,
  PictureAsPdf,
  TrendingUp,
  RadioButtonUnchecked,
  Speed,
  EmojiEvents,
  ShowChart,
  Settings,
  AutoAwesome,
} from "@mui/icons-material";
import NavBar from "../components/NavBar";
import { getAppTheme } from "../theme";
import { TodoItem } from "@/types/todo";
import { exportToCSV, exportToPDF, getExportSummary } from "@/utils/exportUtils";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import AutomationRules from "../components/AutomationRules";

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default function InsightsPage() {
  const [mounted, setMounted] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [user, setUser] = useState<{ id: string; username: string } | null>(
    null,
  );
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [tabValue, setTabValue] = useState(0);
  
  const theme = useMemo(() => 
    mounted ? getAppTheme(isDarkMode) : getAppTheme(true), 
    [isDarkMode, mounted]
  );
  const router = useRouter();

  const sectionPaperSx = {
    backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff",
    border: "1px solid",
    borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    borderRadius: 3,
  };

  const chipTone = isDarkMode
    ? {
        backgroundColor: "rgba(255,255,255,0.08)",
        color: "#eaf7f0",
        borderColor: "rgba(255,255,255,0.2)",
      }
    : {};

  const chipGroupSx = {
    display: "flex",
    flexWrap: "wrap",
    gap: 1,
    alignItems: "center",
  };

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem("darkMode", JSON.stringify(next));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("currentUser");
      setUser(null);
      window.location.href = "/auth/login";
    }
  };

  // Handle paginated API response
  const fetchTodos = async (userId: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(`/api/todos?userId=${userId}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      const data = await response.json();
      
      let todosArray: TodoItem[] = [];
      
      if (Array.isArray(data)) {
        todosArray = data;
      } else if (data.tasks && Array.isArray(data.tasks)) {
        todosArray = data.tasks;
      } else {
        todosArray = [];
      }
      
      console.log("Insights page - fetched tasks:", todosArray.length);
      setTodos(todosArray);
    } catch (err) {
      console.error("Error fetching todos:", err);
      setTodos([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    
    const storedDarkMode = JSON.parse(
      localStorage.getItem("darkMode") || "true",
    );
    setIsDarkMode(storedDarkMode);
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const storedUser = JSON.parse(
      localStorage.getItem("currentUser") || "null",
    );
    
    if (!storedUser || !accessToken) {
      router.push("/auth/login");
      return;
    }
    
    setUser(storedUser);
    fetchTodos(storedUser.id, true);
  }, [router]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayEnd = useMemo(() => {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return end;
  }, [today]);

  // Safe stats calculation with array checks
  const stats = useMemo(() => {
    const todosArray = Array.isArray(todos) ? todos : [];
    
    const total = todosArray.length;
    const completed = todosArray.filter((t) => t.completed).length;
    const active = total - completed;
    const overdue = todosArray.filter((t) => {
      const date = parseDate(t.dueDate);
      return date && date < today && !t.completed;
    }).length;
    const todayCount = todosArray.filter((t) => {
      const date = parseDate(t.dueDate);
      return (
        date &&
        date.getTime() >= today.getTime() &&
        date.getTime() <= todayEnd.getTime() &&
        !t.completed
      );
    }).length;
    const highPriority = todosArray.filter(
      (t) => !t.completed && (t.priority || "medium") === "high",
    ).length;

    const categoryMap: Record<string, number> = {};
    todosArray.forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
    });

    const priorityMap = {
      high: todosArray.filter((t) => (t.priority || "medium") === "high").length,
      medium: todosArray.filter((t) => (t.priority || "medium") === "medium").length,
      low: todosArray.filter((t) => (t.priority || "medium") === "low").length,
    };

    return {
      total,
      completed,
      active,
      overdue,
      todayCount,
      highPriority,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      categoryMap,
      priorityMap,
    };
  }, [todos, today, todayEnd]);

  const categoryBreakdown = useMemo(
    () =>
      Object.entries(stats.categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    [stats.categoryMap],
  );

  // Export handlers
  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };
  
  const handleExportClose = () => {
    setExportAnchorEl(null);
  };
  
  const handleExportCSV = () => {
    exportToCSV(todos);
    handleExportClose();
  };
  
  const handleExportPDF = () => {
    exportToPDF(todos, user?.username || "User");
    handleExportClose();
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Show loading state on first render
  if (!mounted || loading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <div>Loading insights...</div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: isDarkMode
            ? "radial-gradient(circle at 20% 20%, #0a3d2c 0, #060f0b 35%, #040907 100%)"
            : "radial-gradient(circle at 12% 18%, #d9f2e5 0, #eef7f2 45%, #f5f8f6 100%)",
          color: isDarkMode ? "#e6f3ec" : "#0d2621",
          transition: "background 0.3s ease",
        }}
      >
        <NavBar
          user={user}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          onLogout={logout}
        />

        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header with Export Button */}
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" fontWeight={800}>
              Insights & Analytics
            </Typography>
            
            <div>
              <Tooltip title="Export Data">
                <Button
                  variant="contained"
                  startIcon={<Download />}
                  onClick={handleExportClick}
                  sx={{ color: "#ffffff" }}
                >
                  Export
                </Button>
              </Tooltip>
              <Menu
                anchorEl={exportAnchorEl}
                open={Boolean(exportAnchorEl)}
                onClose={handleExportClose}
              >
                <MenuItem onClick={handleExportCSV}>
                  <Description sx={{ mr: 1 }} />
                  Export as CSV
                </MenuItem>
                <MenuItem onClick={handleExportPDF}>
                  <PictureAsPdf sx={{ mr: 1 }} />
                  Export as PDF
                </MenuItem>
              </Menu>
            </div>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3, backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff", borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <TrendingUp sx={{ fontSize: 40, color: "#4caf50" }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.completionRate}%</Typography>
                    <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3, backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff", borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <CheckCircle sx={{ fontSize: 40, color: "#4caf50" }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.completed}</Typography>
                    <Typography variant="body2" color="text.secondary">Completed Tasks</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3, backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff", borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <RadioButtonUnchecked sx={{ fontSize: 40, color: "#ff9800" }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.active}</Typography>
                    <Typography variant="body2" color="text.secondary">Active Tasks</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={0} sx={{ p: 3, backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff", borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Flag sx={{ fontSize: 40, color: "#f44336" }} />
                  <Box>
                    <Typography variant="h4" fontWeight={700}>{stats.total}</Typography>
                    <Typography variant="body2" color="text.secondary">Total Tasks</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Tabs Navigation */}
          <Paper 
            elevation={0} 
            sx={{ 
              mb: 3, 
              backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff",
              borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: 2,
            }}
          >
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  py: 2,
                },
                '& .Mui-selected': {
                  color: '#0f8f5f',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#0f8f5f',
                },
              }}
            >
              <Tab 
                icon={<Insights />} 
                iconPosition="start" 
                label="Overview" 
              />
              <Tab 
                icon={<ShowChart />} 
                iconPosition="start" 
                label="Analytics" 
              />
              <Tab 
                icon={<Settings />} 
                iconPosition="start" 
                label="Automation" 
              />
            </Tabs>
          </Paper>

          {/* Tab 0: Overview */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 3, height: "100%", ...sectionPaperSx }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Insights color="primary" />
                    <Typography variant="h6" fontWeight={700}>Category breakdown</Typography>
                  </Stack>
                  <Stack spacing={1.5}>
                    {categoryBreakdown.length === 0 && (
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>Add tasks to see insights.</Typography>
                    )}
                    {categoryBreakdown.slice(0, 6).map((entry) => {
                      const percent = stats.total ? Math.round((entry.count / stats.total) * 100) : 0;
                      return (
                        <Box key={entry.category}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight={700}>{entry.category}</Typography>
                            <Typography variant="caption">{entry.count} · {percent}%</Typography>
                          </Stack>
                          <LinearProgress 
                            variant="determinate" 
                            value={percent} 
                            sx={{ 
                              mt: 0.5, 
                              height: 10, 
                              borderRadius: 5,
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#4caf50',
                                borderRadius: 5,
                              },
                            }} 
                          />
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  <Paper elevation={0} sx={{ p: 3, ...sectionPaperSx }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <Flag color="error" />
                      <Typography variant="h6" fontWeight={700}>Priority mix</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      {(["high", "medium", "low"] as const).map((priority) => {
                        const totalForPriority = stats.priorityMap[priority] || 0;
                        const percent = stats.total ? Math.round((totalForPriority / stats.total) * 100) : 0;
                        const colors = { high: '#f44336', medium: '#ff9800', low: '#4caf50' };
                        return (
                          <Grid item xs={12} sm={4} key={priority}>
                            <Paper 
                              elevation={0} 
                              sx={{ 
                                p: 2, 
                                backgroundColor: isDarkMode ? "#14261f" : "#f8fbf9", 
                                height: "100%",
                                border: `1px solid ${colors[priority]}40`,
                                borderRadius: 2,
                              }}
                            >
                              <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ color: colors[priority] }}>
                                {priority.toUpperCase()}
                              </Typography>
                              <Typography variant="h4" fontWeight={800}>{totalForPriority}</Typography>
                              <Typography variant="caption" sx={{ opacity: 0.8 }}>{percent}% of total</Typography>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Paper>

                  <Paper elevation={0} sx={{ p: 3, ...sectionPaperSx }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                      <CalendarMonth color="primary" />
                      <Typography variant="h6" fontWeight={700}>Active timeline</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={chipGroupSx}>
                      <Chip 
                        label={`${stats.overdue} overdue`} 
                        color={stats.overdue ? "error" : "default"} 
                        sx={chipTone}
                        icon={<Flag />}
                      />
                      <Chip 
                        label={`${stats.todayCount} due today`} 
                        color="primary" 
                        variant="outlined" 
                        sx={chipTone}
                        icon={<CalendarMonth />}
                      />
                      <Chip 
                        label={`${stats.active} in progress`} 
                        variant="outlined" 
                        sx={chipTone}
                        icon={<RadioButtonUnchecked />}
                      />
                    </Stack>
                    <Divider sx={{ my: 2, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                    <Typography variant="body2" gutterBottom fontWeight={500}>
                      Completion momentum
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.completionRate} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: '#4caf50',
                          borderRadius: 5,
                        },
                      }} 
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {stats.completed} of {stats.total} tasks completed
                    </Typography>
                  </Paper>
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Advanced Analytics */}
          {tabValue === 1 && (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <ShowChart sx={{ color: "#4caf50", fontSize: 32 }} />
                <Typography variant="h5" fontWeight={800}>Advanced Analytics</Typography>
                <Chip label="AI-Powered" size="small" color="primary" sx={{ ml: 1 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                📊 Deep dive into your productivity patterns with interactive charts and AI-powered insights
              </Typography>
              <AnalyticsDashboard tasks={todos} isDarkMode={isDarkMode} />
            </Box>
          )}

          {/* Tab 2: Automation Rules */}
          {tabValue === 2 && user && (
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                <Settings sx={{ color: "#0f8f5f", fontSize: 32 }} />
                <Typography variant="h5" fontWeight={800}>Workflow Automation</Typography>
                <Chip label="Beta" size="small" color="info" sx={{ ml: 1 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                🤖 Automate repetitive tasks and get smart notifications. Create rules that trigger based on task changes.
              </Typography>
              <AutomationRules 
                userId={user.id} 
                isDarkMode={isDarkMode}
                onRuleTriggered={() => fetchTodos(user.id, false)}
              />
            </Box>
          )}

          {/* Export Info */}
          <Paper 
            elevation={0} 
            sx={{ 
              mt: 4, 
              p: 2.5, 
              backgroundColor: isDarkMode ? "#0f1f1a" : "#ffffff", 
              textAlign: 'center',
              borderRadius: 2,
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              📊 Export your data as CSV or PDF to analyze offline. The export includes all {stats.total} tasks with details.
            </Typography>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}