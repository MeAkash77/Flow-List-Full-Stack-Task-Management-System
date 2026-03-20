// src/utils/exportUtils.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TodoItem } from '@/types/todo';

// Format date for export
const formatDate = (date?: string | null) => {
  if (!date) return 'No due date';
  return new Date(date).toLocaleDateString();
};

// Convert tasks to CSV format
export const exportToCSV = (tasks: TodoItem[]) => {
  // Define CSV headers
  const headers = [
    'Task',
    'Category',
    'Priority',
    'Status',
    'Due Date',
    'Notes',
    'Created At'
  ];

  // Convert tasks to CSV rows
  const rows = tasks.map(task => [
    task.task,
    task.category,
    (task.priority || 'medium').toUpperCase(),
    task.completed ? 'Completed' : 'Active',
    formatDate(task.dueDate),
    task.notes || '',
    task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Convert tasks to PDF format
export const exportToPDF = (tasks: TodoItem[], username: string) => {
  // Create PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('Tasks Export', 14, 22);
  
  // Add metadata
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`User: ${username}`, 14, 32);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);
  doc.text(`Total Tasks: ${tasks.length}`, 14, 44);
  
  // Prepare table data
  const tableData = tasks.map(task => [
    task.task,
    task.category,
    (task.priority || 'medium').toUpperCase(),
    task.completed ? '✓ Completed' : '○ Active',
    formatDate(task.dueDate),
    task.notes?.substring(0, 50) || '-'
  ]);
  
  // Add table
  autoTable(doc, {
    startY: 50,
    head: [['Task', 'Category', 'Priority', 'Status', 'Due Date', 'Notes']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [76, 175, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 40 },
    },
  });
  
  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 20,
      doc.internal.pageSize.getHeight() - 10
    );
  }
  
  // Download PDF
  doc.save(`tasks_export_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Get summary statistics for export
export const getExportSummary = (tasks: TodoItem[]) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  
  const byPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };
  
  const byCategory = tasks.reduce((acc, task) => {
    acc[task.category] = (acc[task.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total,
    completed,
    active,
    completionRate,
    byPriority,
    byCategory,
  };
};