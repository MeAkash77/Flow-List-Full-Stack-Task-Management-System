// src/app/components/GeminiAIAssistant.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Fab,
  Drawer,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Divider,
  Collapse,
  Card,
  CardContent,
} from '@mui/material';
import {
  SmartToy,
  Close,
  Send,
  AutoAwesome,
  Lightbulb,
  Schedule,
  Category,
  ExpandMore,
  ExpandLess,
  Psychology,
} from '@mui/icons-material';
import { GeminiTaskAssistant, AITaskSuggestion, AIInsight } from '@/lib/geminiService';

interface GeminiAIAssistantProps {
  onAddTask: (task: any) => void;
  tasks?: any[];
  onRefresh?: () => void;
}

export default function GeminiAIAssistant({ onAddTask, tasks = [], onRefresh }: GeminiAIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AITaskSuggestion | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState(true);
  const [error, setError] = useState('');
  const [aiAvailable, setAiAvailable] = useState(true);

  useEffect(() => {
    if (open && tasks.length > 0) {
      loadInsights();
      loadSuggestions();
    }
  }, [open, tasks]);

  const loadInsights = async () => {
    try {
      const newInsights = await GeminiTaskAssistant.getProductivityInsights(tasks);
      setInsights(newInsights);
      setAiAvailable(true);
    } catch (error) {
      console.error('Failed to load insights:', error);
      setAiAvailable(false);
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const completionRate = total ? Math.round((completed / total) * 100) : 0;
      setInsights([
        {
          type: 'recommendation',
          message: `📊 You've completed ${completed} out of ${total} tasks (${completionRate}%). Keep going!`,
          confidence: 1,
          icon: '📊'
        },
        {
          type: 'motivation',
          message: '💪 Every task you complete is a step forward. You\'ve got this!',
          confidence: 1,
          icon: '💪'
        }
      ]);
    }
  };

  const loadSuggestions = async () => {
    try {
      const newSuggestions = await GeminiTaskAssistant.getSmartSuggestions(tasks);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions([
        'Review and prioritize your tasks',
        'Break down complex tasks into smaller steps',
        'Schedule focused time for high-priority items'
      ]);
    }
  };

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError('');
    setSuggestion(null);
    
    try {
      const parsed = await GeminiTaskAssistant.parseTask(input);
      if (parsed && parsed.title) {
        setSuggestion(parsed);
      } else {
        setError('Could not parse this task. Try being more specific.');
      }
    } catch (err) {
      setError('Failed to analyze task. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    if (suggestion) {
      onAddTask({
        task: suggestion.title,
        category: suggestion.category || 'General',
        priority: suggestion.priority || 'medium',
        dueDate: suggestion.dueDate || '',
        notes: suggestion.notes || '',
      });
      setInput('');
      setSuggestion(null);
      setOpen(false);
    }
  };

  const handleSuggestionClick = async (suggestionText: string) => {
    setInput(suggestionText);
    await handleAnalyze();
  };

  return (
    <>
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #1a73e8 0%, #4285f4 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1557b0 0%, #2a5fcf 100%)',
          },
          zIndex: 1000,
        }}
        onClick={() => setOpen(true)}
      >
        <SmartToy />
      </Fab>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 500 },
            p: 3,
            overflowY: 'auto',
            maxHeight: '100vh',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome sx={{ color: '#4285f4' }} />
            <Typography variant="h6" fontWeight={700}>
              Gemini AI Assistant
            </Typography>
            <Chip
              label="Powered by Google AI"
              size="small"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
          <IconButton onClick={() => setOpen(false)}>
            <Close />
          </IconButton>
        </Box>

        {!aiAvailable && (
          <Alert severity="info" sx={{ mb: 2 }}>
            💡 Using smart fallback mode. Some AI features may be limited.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          ✨ Describe your task naturally, and Gemini AI will help organize it intelligently.
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="e.g., Call John about the project tomorrow at 3pm, this is urgent!"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={handleAnalyze}
          disabled={loading || !input.trim()}
          sx={{ mb: 3 }}
        >
          {loading ? 'Analyzing with Gemini...' : '✨ Analyze Task'}
        </Button>

        {loading && <LinearProgress sx={{ mb: 3 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {suggestion && (
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              🤖 AI Suggests
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
              {suggestion.title}
            </Typography>

            <Stack spacing={1} sx={{ mb: 2 }}>
              {suggestion.category && (
                <Chip
                  icon={<Category />}
                  label={`Category: ${suggestion.category}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {suggestion.priority && (
                <Chip
                  icon={<AutoAwesome />}
                  label={`Priority: ${suggestion.priority.toUpperCase()}`}
                  size="small"
                  color={suggestion.priority === 'high' ? 'error' : suggestion.priority === 'medium' ? 'warning' : 'success'}
                  variant="outlined"
                />
              )}
              {suggestion.dueDate && (
                <Chip
                  icon={<Schedule />}
                  label={`Due: ${new Date(suggestion.dueDate).toLocaleDateString()}`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            {suggestion.notes && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary" display="block">
                  📝 Notes: {suggestion.notes}
                </Typography>
              </>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={handleAddTask}
              sx={{ mt: 2 }}
            >
              Add to My Tasks
            </Button>
          </Paper>
        )}

        {insights.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Button
              fullWidth
              onClick={() => setShowInsights(!showInsights)}
              sx={{ justifyContent: 'space-between', mb: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology />
                <Typography variant="subtitle2">AI Insights</Typography>
              </Box>
              {showInsights ? <ExpandLess /> : <ExpandMore />}
            </Button>
            <Collapse in={showInsights}>
              <Stack spacing={1}>
                {insights.map((insight, index) => (
                  <Alert
                    key={index}
                    severity={insight.type === 'alert' ? 'warning' : 'info'}
                    icon={insight.icon || (insight.type === 'alert' ? '⚠️' : '💡')}
                    sx={{ '& .MuiAlert-message': { width: '100%' } }}
                  >
                    {insight.message}
                  </Alert>
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}

        {suggestions.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Lightbulb />
              Suggested Tasks
            </Typography>
            <Stack spacing={1}>
              {suggestions.map((suggestionItem, index) => (
                <Card 
                  key={index} 
                  variant="outlined" 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }} 
                  onClick={() => handleSuggestionClick(suggestionItem)}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="body2">{suggestionItem}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        )}

        <Box sx={{ mt: 'auto', pt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.secondary" display="block">
            💡 Try saying: "Finish report by Friday", "High priority: Call client ASAP", or "Buy groceries for weekend"
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            🔒 Powered by Google Gemini AI | Free & Private
          </Typography>
        </Box>
      </Drawer>
    </>
  );
}