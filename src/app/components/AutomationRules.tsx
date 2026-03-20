// src/app/components/AutomationRules.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  NotificationsActive,
  Update,
  CreateNewFolder,
  Archive,
  Schedule,
  Flag,
  AutoAwesome,
  CheckCircle,      // ✅ Added missing import
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import toast from 'react-hot-toast';

interface AutomationRule {
  id: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  triggerValue?: string;
  condition?: any;
  actionType: string;
  actionValue?: any;
  createdAt: string;
}

interface AutomationRulesProps {
  userId: string;
  isDarkMode: boolean;
  onRuleTriggered?: () => void;
}

export default function AutomationRules({ userId, isDarkMode, onRuleTriggered }: AutomationRulesProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    triggerType: 'TASK_CREATED',
    triggerValue: '',
    conditionPriority: '',
    conditionCategory: '',
    actionType: 'NOTIFY',
    actionValue: '',
  });

  // Fetch rules
  const fetchRules = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/automation/rules?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [userId]);

  // Toggle rule active status
  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/automation/rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (response.ok) {
        toast.success(`Rule ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchRules();
      }
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  // Delete rule
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/automation/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Rule deleted');
        fetchRules();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  // Save rule
  const saveRule = async () => {
    if (!ruleForm.name) {
      toast.error('Please enter a rule name');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const condition: any = {};
      if (ruleForm.conditionPriority) condition.priority = ruleForm.conditionPriority;
      if (ruleForm.conditionCategory) condition.category = ruleForm.conditionCategory;

      const actionValue: any = {};
      if (ruleForm.actionType === 'UPDATE_TASK' && ruleForm.actionValue) {
        if (ruleForm.actionValue === 'priority') actionValue.priority = 'high';
        else if (ruleForm.actionValue === 'priority_medium') actionValue.priority = 'medium';
        else if (ruleForm.actionValue === 'category_work') actionValue.category = 'Work';
      }

      const response = await fetch(`/api/automation/rules`, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(editingRule && { ruleId: editingRule.id }),
          name: ruleForm.name,
          triggerType: ruleForm.triggerType,
          triggerValue: ruleForm.triggerValue || null,
          condition: Object.keys(condition).length ? condition : null,
          actionType: ruleForm.actionType,
          actionValue: Object.keys(actionValue).length ? actionValue : null,
          userId,
        }),
      });

      if (response.ok) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created');
        setOpenDialog(false);
        setEditingRule(null);
        setRuleForm({
          name: '',
          triggerType: 'TASK_CREATED',
          triggerValue: '',
          conditionPriority: '',
          conditionCategory: '',
          actionType: 'NOTIFY',
          actionValue: '',
        });
        fetchRules();
      } else {
        toast.error('Failed to save rule');
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Something went wrong');
    }
  };

  // Template rules
  const applyTemplate = (template: string) => {
    const templates: Record<string, any> = {
      'high-priority-alert': {
        name: 'High Priority Alert',
        triggerType: 'TASK_CREATED',
        conditionPriority: 'high',
        actionType: 'NOTIFY',
        actionValue: 'notify',
      },
      'due-soon-alert': {
        name: 'Due Soon Alert',
        triggerType: 'DUE_DATE_APPROACHING',
        triggerValue: '2h',
        actionType: 'NOTIFY',
        actionValue: 'notify',
      },
      'auto-archive': {
        name: 'Auto Archive Completed',
        triggerType: 'TASK_COMPLETED',
        actionType: 'ARCHIVE',
        actionValue: 'archive',
      },
      'priority-boost': {
        name: 'Boost Priority When Due',
        triggerType: 'DUE_DATE_APPROACHING',
        triggerValue: '4h',
        actionType: 'UPDATE_TASK',
        actionValue: 'priority',
      },
    };

    const templateData = templates[template];
    if (templateData) {
      setRuleForm({
        name: templateData.name,
        triggerType: templateData.triggerType,
        triggerValue: templateData.triggerValue || '',
        conditionPriority: templateData.conditionPriority || '',
        conditionCategory: templateData.conditionCategory || '',
        actionType: templateData.actionType,
        actionValue: templateData.actionValue,
      });
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Rule Name', flex: 1.5, minWidth: 180 },
    {
      field: 'triggerType',
      headerName: 'Trigger',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => {
        const triggers: Record<string, string> = {
          TASK_CREATED: 'Task Created',
          TASK_UPDATED: 'Task Updated',
          TASK_COMPLETED: 'Task Completed',
          DUE_DATE_APPROACHING: 'Due Date Approaching',
          PRIORITY_CHANGED: 'Priority Changed',
        };
        return <Chip label={triggers[params.value] || params.value} size="small" />;
      },
    },
    {
      field: 'actionType',
      headerName: 'Action',
      flex: 1,
      minWidth: 120,
      renderCell: (params) => {
        const actions: Record<string, string> = {
          NOTIFY: 'Notify',
          UPDATE_TASK: 'Update Task',
          CREATE_TASK: 'Create Task',
          ARCHIVE: 'Archive',
        };
        return <Chip label={actions[params.value] || params.value} size="small" variant="outlined" />;
      },
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Switch
          checked={params.value}
          onChange={() => toggleRule(params.row.id, params.value)}
          color="success"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => {
                setEditingRule(params.row);
                setRuleForm({
                  name: params.row.name,
                  triggerType: params.row.triggerType,
                  triggerValue: params.row.triggerValue || '',
                  conditionPriority: params.row.condition?.priority || '',
                  conditionCategory: params.row.condition?.category || '',
                  actionType: params.row.actionType,
                  actionValue: params.row.actionValue ? Object.keys(params.row.actionValue)[0] || '' : '',
                });
                setOpenDialog(true);
              }}
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => deleteRule(params.row.id)}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const triggerIcons: Record<string, React.ReactNode> = {
    TASK_CREATED: <CreateNewFolder />,
    TASK_UPDATED: <Update />,
    TASK_COMPLETED: <CheckCircle />,
    DUE_DATE_APPROACHING: <Schedule />,
    PRIORITY_CHANGED: <Flag />,
  };

  const actionIcons: Record<string, React.ReactNode> = {
    NOTIFY: <NotificationsActive />,
    UPDATE_TASK: <Update />,
    CREATE_TASK: <CreateNewFolder />,
    ARCHIVE: <Archive />,
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            🤖 Workflow Automation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create rules that automate your workflow. Let AI handle repetitive tasks.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingRule(null);
            setRuleForm({
              name: '',
              triggerType: 'TASK_CREATED',
              triggerValue: '',
              conditionPriority: '',
              conditionCategory: '',
              actionType: 'NOTIFY',
              actionValue: '',
            });
            setOpenDialog(true);
          }}
          sx={{ background: 'linear-gradient(135deg, #4caf50, #2196f3)' }}
        >
          Create Rule
        </Button>
      </Stack>

      {/* Quick Templates */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Quick Templates
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<NotificationsActive />}
            onClick={() => applyTemplate('high-priority-alert')}
          >
            High Priority Alert
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Schedule />}
            onClick={() => applyTemplate('due-soon-alert')}
          >
            Due Soon Alert
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Archive />}
            onClick={() => applyTemplate('auto-archive')}
          >
            Auto Archive
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Flag />}
            onClick={() => applyTemplate('priority-boost')}
          >
            Priority Boost
          </Button>
        </Stack>
      </Box>

      {/* Rules Table */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          background: isDarkMode ? '#0f1f1a' : '#ffffff',
          borderRadius: 2,
        }}
      >
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <Typography>Loading rules...</Typography>
          </Box>
        ) : rules.length === 0 ? (
          <Box textAlign="center" py={4}>
            <AutoAwesome sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" fontWeight={600}>
              No automation rules yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first rule to automate repetitive tasks
            </Typography>
            <Button
              variant="contained"
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 2 }}
            >
              Create Rule
            </Button>
          </Box>
        ) : (
          <DataGrid
            rows={rules}
            columns={columns}
            initialState={{
              pagination: { paginationModel: { pageSize: 5 } },
            }}
            pageSizeOptions={[5, 10]}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                borderBottom: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
              },
            }}
          />
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Rule Name"
              fullWidth
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              placeholder="e.g., High Priority Alert"
            />

            <FormControl fullWidth>
              <InputLabel>When this happens (Trigger)</InputLabel>
              <Select
                value={ruleForm.triggerType}
                label="When this happens (Trigger)"
                onChange={(e) => setRuleForm({ ...ruleForm, triggerType: e.target.value })}
              >
                <MenuItem value="TASK_CREATED">Task Created</MenuItem>
                <MenuItem value="TASK_UPDATED">Task Updated</MenuItem>
                <MenuItem value="TASK_COMPLETED">Task Completed</MenuItem>
                <MenuItem value="DUE_DATE_APPROACHING">Due Date Approaching</MenuItem>
                <MenuItem value="PRIORITY_CHANGED">Priority Changed</MenuItem>
              </Select>
            </FormControl>

            {ruleForm.triggerType === 'DUE_DATE_APPROACHING' && (
              <TextField
                label="Trigger when (e.g., 2h, 1d, 1w)"
                placeholder="2h, 1d, 1w"
                value={ruleForm.triggerValue}
                onChange={(e) => setRuleForm({ ...ruleForm, triggerValue: e.target.value })}
              />
            )}

            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
              Optional: Only if task matches these conditions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={ruleForm.conditionPriority}
                    label="Priority"
                    onChange={(e) => setRuleForm({ ...ruleForm, conditionPriority: e.target.value })}
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={ruleForm.conditionCategory}
                    label="Category"
                    onChange={(e) => setRuleForm({ ...ruleForm, conditionCategory: e.target.value })}
                  >
                    <MenuItem value="">Any</MenuItem>
                    <MenuItem value="Work">Work</MenuItem>
                    <MenuItem value="Personal">Personal</MenuItem>
                    <MenuItem value="Shopping">Shopping</MenuItem>
                    <MenuItem value="Health">Health</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={600} sx={{ mt: 1 }}>
              Then do this (Action)
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={ruleForm.actionType}
                label="Action"
                onChange={(e) => setRuleForm({ ...ruleForm, actionType: e.target.value })}
              >
                <MenuItem value="NOTIFY">Send Notification</MenuItem>
                <MenuItem value="UPDATE_TASK">Update Task</MenuItem>
                <MenuItem value="ARCHIVE">Archive Task</MenuItem>
                <MenuItem value="CREATE_TASK">Create New Task</MenuItem>
              </Select>
            </FormControl>

            {ruleForm.actionType === 'UPDATE_TASK' && (
              <FormControl fullWidth>
                <InputLabel>What to update</InputLabel>
                <Select
                  value={ruleForm.actionValue}
                  label="What to update"
                  onChange={(e) => setRuleForm({ ...ruleForm, actionValue: e.target.value })}
                >
                  <MenuItem value="priority">Set Priority to High</MenuItem>
                  <MenuItem value="priority_medium">Set Priority to Medium</MenuItem>
                  <MenuItem value="category_work">Set Category to Work</MenuItem>
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRule}>
            {editingRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Box */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          💡 <strong>Pro Tip:</strong> Automation rules run automatically when tasks match your conditions.
          You'll receive notifications and see updates in real-time.
        </Typography>
      </Alert>
    </Box>
  );
}