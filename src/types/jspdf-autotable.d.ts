// src/types/jspdf-autotable.d.ts
declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface AutoTableOptions {
    startY?: number;
    head?: (string | string[])[];
    body?: any[][];
    theme?: 'striped' | 'grid' | 'plain';
    headStyles?: any;
    styles?: any;
    columnStyles?: any;
    [key: string]: any;
  }
  
  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}