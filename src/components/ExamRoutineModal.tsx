"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Users, Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE_URL = 'https://smart-school-backend-production.up.railway.app';
const getApiToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }
  return '';
};

// ── Palette ──────────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const C = {
  navy:         [15,  23,  42]  as RGB, // slate-900
  primary:      [30,  64, 175]  as RGB, // blue-800
  primaryLight: [219,234, 254]  as RGB, // blue-100
  primaryBg:    [239,246, 255]  as RGB, // blue-50
  accent:       [245,158,  11]  as RGB, // amber-400
  green:        [21, 128,  61]  as RGB, // green-700
  greenLight:   [220,252, 231]  as RGB,
  greenBorder:  [134,239, 172]  as RGB,
  red:          [185,  28,  28] as RGB,
  redLight:     [254, 226, 226] as RGB,
  redBorder:    [252, 165, 165] as RGB,
  orange:       [194,  65,  12] as RGB, // orange-700
  amber:        [161,  98,   7] as RGB, // amber-700
  white:        [255, 255, 255] as RGB,
  gray50:       [249, 250, 251] as RGB,
  gray100:      [243, 244, 246] as RGB,
  gray200:      [229, 231, 235] as RGB,
  gray400:      [156, 163, 175] as RGB,
  gray500:      [107, 114, 128] as RGB,
  gray600:      [ 75,  85,  99] as RGB,
  gray700:      [ 55,  65,  81] as RGB,
  gray900:      [ 17,  24,  39] as RGB,
  blue500:      [ 59, 130, 246] as RGB,
};

const GRADE_COLOR: Record<string, RGB> = {
  'A+': C.green,
  'A':  [22, 163,  74],
  'B+': C.primary,
  'B':  C.blue500,
  'C+': C.amber,
  'C':  [217, 119,   6],
  'D':  C.orange,
  'F':  C.red,
};

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Exam {
  id: string;
  exam_name: string;
  description: string;
  start_date: string;
  end_date: string;
  isPublished: boolean;
  assignments: {
    id: string;
    class:    { name: string; uuid: string };
    subject:  { name: string; uuid: string };
    examiner: { name: string; uuid: string };
    date:     string;
    syllabus: string;
  }[];
}
interface SectionEntity { id: string; name: string; classId: string }
interface StudentEntity {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  rollNumber?: string;
  roll_number?: string;
}
interface ExamRoutineModalProps { exam: Exam; onClose: () => void }

// ── Pure helpers ──────────────────────────────────────────────────────────────
const getGrade = (pct: number): string => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C+';
  if (pct >= 40) return 'C';
  if (pct >= 33) return 'D';
  return 'F';
};

const studentLabel = (s: StudentEntity) =>
  s.name || `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Unknown';

const rollLabel = (s: StudentEntity) =>
  s.rollNumber || s.roll_number || '—';

// ── PDF drawing helpers ───────────────────────────────────────────────────────
function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB) {
  doc.setFillColor(...color);
  doc.rect(x, y, w, h, 'F');
}
function roundedFill(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill: RGB, stroke?: RGB) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke); else doc.setDrawColor(...fill);
  doc.roundedRect(x, y, w, h, r, r, stroke ? 'FD' : 'F');
}
function footer(doc: jsPDF, pageNum: number) {
  const W = doc.internal.pageSize.width;
  const H = doc.internal.pageSize.height;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.gray400);
  doc.text(`Page ${pageNum}`, 14, H - 6);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 14, H - 6, { align: 'right' });
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function ExamRoutineModal({ exam, onClose }: ExamRoutineModalProps) {
  const [activeTab, setActiveTab] = useState<'routine' | 'results'>('routine');

  const [selectedClassId,   setSelectedClassId]   = useState('');
  const [sections,          setSections]           = useState<SectionEntity[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [marksForm, setMarksForm] = useState<Record<string, {
    marksObtained: number | string;
    totalMarks:    number | string;
    loading?:      boolean;
  }>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [students,        setStudents]        = useState<StudentEntity[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // PDF state
  const [allExamMarks,          setAllExamMarks]          = useState<any[]>([]);
  const [schoolInfo,            setSchoolInfo]            = useState<any>(null);
  const [generatingClassPDF,    setGeneratingClassPDF]    = useState(false);
  const [generatingStudentPDFId,setGeneratingStudentPDFId]= useState<string | null>(null);

  // Derived: unique classes from exam assignments
  const uniqueClasses = Array.from(
    new Map(
      exam.assignments
        ?.filter(a => a.class?.uuid && a.class?.name)
        .map(a => [a.class.uuid, a.class])
    ).values()
  );

  // Derived: subjects for the currently selected class
  const classSubjects = Array.from(
    new Map(
      exam.assignments
        ?.filter(a => a.class?.uuid === selectedClassId && a.subject?.uuid)
        .map(a => [a.subject.uuid, a.subject])
    ).values()
  );

  // ── API helpers ─────────────────────────────────────────────────────────────
  const getUserSchoolId = () => {
    try {
      const payload = JSON.parse(atob(getApiToken().split('.')[1]));
      return payload.schoolId;
    } catch { return null; }
  };

  const authHeaders = () => ({
    'accept': '*/*',
    'Authorization': `Bearer ${getApiToken()}`
  });

  const fetchLatestMarks = async (): Promise<any[]> => {
    const res  = await fetch(`${API_BASE_URL}/admin/marks?examId=${exam.id}`, { headers: authHeaders() });
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
  };

  const refreshAllExamMarks = async () => {
    try { setAllExamMarks(await fetchLatestMarks()); }
    catch (e) { console.error('Failed to refresh marks', e); }
  };

  // ── On mount: fetch marks + school info ─────────────────────────────────────
  useEffect(() => { refreshAllExamMarks(); }, [exam.id]); // eslint-disable-line

  useEffect(() => {
    const run = async () => {
      try {
        const res   = await fetch(`${API_BASE_URL}/admin/schools`, { headers: authHeaders() });
        const json  = await res.json();
        const list: any[] = Array.isArray(json) ? json : (json.data || []);
        const uid   = getUserSchoolId();
        const found = list.find(s => s.schoolId === uid || s.id === uid);
        if (found) setSchoolInfo(found);
      } catch(e) { console.error('school info', e); }
    };
    run();
  }, []); // eslint-disable-line

  // ── Marks save: individual ──────────────────────────────────────────────────
  const handleSaveMarks = async (studentId: string) => {
    const form = marksForm[studentId];
    if (!form || form.marksObtained === '' || form.totalMarks === '') {
      alert('Please enter both marks obtained and total marks'); return;
    }
    const assignment = exam.assignments.find(
      a => a.class?.uuid === selectedClassId && a.subject?.uuid === selectedSubjectId
    );
    if (!assignment?.examiner?.uuid) { alert('Examiner not found for this subject'); return; }

    setMarksForm(prev => ({ ...prev, [studentId]: { ...prev[studentId], loading: true } }));
    try {
      const res = await fetch(`${API_BASE_URL}/admin/marks`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId:    exam.id,
          teacherId: assignment.examiner.uuid,
          schoolId:  getUserSchoolId(),
          marks: [{
            studentId,
            subjectId:      selectedSubjectId,
            marksObtained:  Number(form.marksObtained),
            totalMarks:     Number(form.totalMarks)
          }]
        })
      });
      if (!res.ok) throw new Error();
      alert('Marks saved!');
      await refreshAllExamMarks();
    } catch { alert('Failed to save marks'); }
    finally {
      setMarksForm(prev => ({ ...prev, [studentId]: { ...prev[studentId], loading: false } }));
    }
  };

  // ── Marks save: bulk ────────────────────────────────────────────────────────
  const handleSaveAllMarks = async () => {
    const payload = students.flatMap(st => {
      const f = marksForm[st.id];
      if (!f || f.marksObtained === '' || f.totalMarks === '') return [];
      return [{ studentId: st.id, subjectId: selectedSubjectId,
                marksObtained: Number(f.marksObtained), totalMarks: Number(f.totalMarks) }];
    });
    if (!payload.length) { alert('No marks entered to save'); return; }

    const assignment = exam.assignments.find(
      a => a.class?.uuid === selectedClassId && a.subject?.uuid === selectedSubjectId
    );
    if (!assignment?.examiner?.uuid) { alert('Examiner not found for this subject'); return; }

    setIsSavingAll(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/marks`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId:    exam.id,
          teacherId: assignment.examiner.uuid,
          schoolId:  getUserSchoolId(),
          marks:     payload
        })
      });
      if (!res.ok) throw new Error();
      alert('All marks saved!');
      await refreshAllExamMarks();
    } catch { alert('Failed to save all marks'); }
    finally { setIsSavingAll(false); }
  };

  // ── Fetch sections when class changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]); setSelectedSectionId(''); setSelectedSubjectId(''); setStudents([]); return;
    }
    const run = async () => {
      setLoadingSections(true);
      setSelectedSectionId(''); setSelectedSubjectId(''); setStudents([]);
      try {
        const res  = await fetch(
          `${API_BASE_URL}/admin/sections?schoolId=${getUserSchoolId()}&limit=1000`,
          { headers: authHeaders() }
        );
        const json = await res.json();
        let all: SectionEntity[] = json.data?.data || json.data || json || [];
        if (!Array.isArray(all)) all = [];
        setSections(all.filter(s => s.classId === selectedClassId));
      } catch(e) { console.error(e); }
      finally { setLoadingSections(false); }
    };
    run();
  }, [selectedClassId]); // eslint-disable-line

  // ── Fetch students when section changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId) { setStudents([]); return; }
    const run = async () => {
      setLoadingStudents(true);
      try {
        const res  = await fetch(
          `${API_BASE_URL}/general/students/${selectedClassId}?sectionId=${selectedSectionId}`,
          { headers: authHeaders() }
        );
        const json = await res.json();
        let all: StudentEntity[] = json.data?.data || json.data || json || [];
        if (!Array.isArray(all)) all = [];
        setStudents(all);
      } catch(e) { console.error(e); }
      finally { setLoadingStudents(false); }
    };
    run();
  }, [selectedClassId, selectedSectionId]); // eslint-disable-line

  // ── Pre-fill marks form ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId || !students.length) return;
    const run = async () => {
      try {
        const marks = await fetchLatestMarks();
        const filtered = marks.filter(m => m.subjectId === selectedSubjectId);
        setMarksForm(prev => {
          const merged = { ...prev };
          filtered.forEach((m: any) => {
            if (!merged[m.studentId] || merged[m.studentId].marksObtained === '') {
              merged[m.studentId] = { marksObtained: m.marksObtained, totalMarks: m.totalMarks };
            }
          });
          return merged;
        });
      } catch(e) { console.error(e); }
    };
    run();
  }, [exam.id, selectedClassId, selectedSectionId, selectedSubjectId, students]); // eslint-disable-line

  const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA';

  // ════════════════════════════════════════════════════════════════════════════
  // PDF 1 — STUDENT RESULT CARD  (all classes in a single table, single page)
  // ════════════════════════════════════════════════════════════════════════════
  const generateStudentResultPDF = async (student: StudentEntity) => {
    setGeneratingStudentPDFId(student.id);
    try {
      const latestMarks = await fetchLatestMarks();
      const schoolName  = schoolInfo?.name || 'School Management System';
      const name        = studentLabel(student);
      const roll        = rollLabel(student);

      // Find all marks belonging to this student
      const studentMarks     = latestMarks.filter((m: any) => m.studentId === student.id);
      const markedSubjectIds = new Set(studentMarks.map((m: any) => m.subjectId as string));

      // Determine all relevant classes: selectedClassId + any class where student has marks
      const relevantClassIds = new Set<string>([selectedClassId]);
      exam.assignments.forEach(a => {
        if (a.class?.uuid && a.subject?.uuid && markedSubjectIds.has(a.subject.uuid)) {
          relevantClassIds.add(a.class.uuid);
        }
      });

      // Gather subjects across all classes
      interface SubjectRowItem {
        className: string;
        subjectName: string;
        obtained: number | null;
        total: number | null;
        pct: number | null;
        grade: string;
      }

      const allRows: SubjectRowItem[] = [];
      let grandObtained = 0;
      let grandTotal = 0;
      let hasAnyMarks = false;

      const sortedClassIds = Array.from(relevantClassIds);

      sortedClassIds.forEach(classId => {
        const asgns = exam.assignments
          .filter(a => a.class?.uuid === classId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const className = asgns[0]?.class?.name || uniqueClasses.find(c => c.uuid === classId)?.name || 'Class';

        asgns.forEach(a => {
          const mark = studentMarks.find((x: any) => x.subjectId === a.subject?.uuid);
          const obt = mark != null && mark.marksObtained != null ? Number(mark.marksObtained) : null;
          const tot = mark != null && mark.totalMarks != null ? Number(mark.totalMarks) : null;

          if (obt !== null && tot !== null) {
            grandObtained += obt;
            grandTotal += tot;
            hasAnyMarks = true;
          }

          const pct = obt !== null && tot !== null && tot > 0 ? (obt / tot) * 100 : null;
          const grade = pct !== null ? getGrade(pct) : '—';

          allRows.push({
            className,
            subjectName: a.subject?.name || '—',
            obtained: obt,
            total: tot,
            pct,
            grade
          });
        });
      });

      const overallPct = grandTotal > 0 ? (grandObtained / grandTotal) * 100 : null;
      const overallGrade = overallPct !== null ? getGrade(overallPct) : '—';
      const isPassed = overallPct !== null && overallPct >= 33;

      // Create Portrait A4 PDF
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W   = doc.internal.pageSize.width;   // 210mm
      const H   = doc.internal.pageSize.height;  // 297mm

      // ── 1. HEADER BANNER (Compact & clean 36mm) ──
      fillRect(doc, 0, 0, W, 36, C.navy);
      fillRect(doc, 0, 0, W, 3.5, C.primary);
      fillRect(doc, 0, 36, W, 1.8, C.accent);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...C.white);
      doc.text(schoolName, W / 2, 14, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(191, 219, 254);
      doc.text('OFFICIAL STUDENT EXAMINATION RESULT CARD', W / 2, 22, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text(
        `${exam.exam_name}   •   Academic Session: ${fmtDate(exam.start_date)} – ${fmtDate(exam.end_date)}`,
        W / 2, 30, { align: 'center' }
      );

      let y = 43;

      // ── 2. STUDENT INFORMATION CARD (Clean 24mm) ──
      roundedFill(doc, 14, y, W - 28, 23, 3, C.primaryBg, C.primaryLight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...C.navy);
      doc.text(name, 20, y + 8);

      const uniqueClassNames = Array.from(new Set(allRows.map(r => r.className))).join(', ');
      const selSecName = sections.find(s => s.id === selectedSectionId)?.name || '—';

      const infoPills = [
        ['Roll No', roll],
        ['Class(es)', uniqueClassNames || '—'],
        ['Section', selSecName],
        ['Date Issued', new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })]
      ];

      infoPills.forEach(([label, val], idx) => {
        const px = 20 + idx * 44;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.primary);
        doc.text(`${label}:`, px, y + 17);
        const lw = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.gray700);
        doc.text(val, px + lw, y + 17);
      });

      y += 29;

      // ── 3. SINGLE TABLE FOR ALL SUBJECTS ──
      const tableHead = [['#', 'Subject', 'Marks Obtained', 'Full Marks', 'Percentage', 'Grade']];
      const tableBody = allRows.map((r, i) => [
        String(i + 1),
        r.subjectName,
        r.obtained !== null ? String(r.obtained) : '—',
        r.total !== null ? String(r.total) : '—',
        r.pct !== null ? `${r.pct.toFixed(1)}%` : '—',
        r.grade
      ]);

      // Grand Total row at bottom of table
      tableBody.push([
        '',
        `GRAND TOTAL (${allRows.length} Subjects)`,
        hasAnyMarks ? String(grandObtained) : '—',
        grandTotal > 0 ? String(grandTotal) : '—',
        overallPct !== null ? `${overallPct.toFixed(1)}%` : '—',
        overallGrade
      ]);

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: y,
        margin: { left: 14, right: 14 },
        styles: {
          fontSize: 8.5,
          cellPadding: 2.8,
          lineColor: C.gray200,
          lineWidth: 0.15,
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: C.navy as [number, number, number],
          textColor: C.white as [number, number, number],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        alternateRowStyles: { fillColor: C.gray50 as [number, number, number] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left', cellWidth: 70, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 28 },
          3: { halign: 'center', cellWidth: 26 },
          4: { halign: 'center', cellWidth: 26 },
          5: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        },
        didParseCell: (data: any) => {
          const isGrandTotal = data.section === 'body' && data.row.index === tableBody.length - 1;
          if (isGrandTotal) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = C.primaryLight;
            data.cell.styles.textColor = C.navy;
          }
          if (data.section === 'body' && data.column.index === 5) {
            const g = String(data.cell.raw);
            if (GRADE_COLOR[g]) {
              data.cell.styles.textColor = GRADE_COLOR[g];
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // ── 4. OVERALL RESULT SUMMARY CARD (Clean, compact 30mm) ──
      const summaryH = 30;
      const bgCard = isPassed ? C.greenLight : C.redLight;
      const borderCard = isPassed ? C.greenBorder : C.redBorder;
      const badgeBg = isPassed ? C.green : C.red;

      roundedFill(doc, 14, y, W - 28, summaryH, 3, bgCard, borderCard);

      // Section label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.gray500);
      doc.text('RESULT SUMMARY', 22, y + 8);

      // Pass/Fail badge
      roundedFill(doc, W - 42, y + 4.5, 26, 8.5, 2.5, badgeBg);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.white);
      doc.text(isPassed ? 'PASSED' : 'FAILED', W - 29, y + 10, { align: 'center' });

      // Stats row
      const kpis = [
        ['Total Marks Obtained', grandTotal > 0 ? `${grandObtained} / ${grandTotal}` : '—'],
        ['Overall Percentage', overallPct !== null ? `${overallPct.toFixed(2)}%` : '—'],
        ['Final Grade', overallGrade]
      ];

      kpis.forEach(([lbl, val], idx) => {
        const kx = 22 + idx * 52;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.gray600);
        doc.text(lbl, kx, y + 17);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        if (lbl === 'Final Grade') {
          const gColor = GRADE_COLOR[val] || C.navy;
          doc.setTextColor(...gColor);
        } else {
          doc.setTextColor(...C.navy);
        }
        doc.text(val, kx, y + 25);
      });

      y += summaryH + 8;

      // ── 5. GRADING SCALE LEGEND (Single thin bar) ──
      const scaleGrades = ['A+ (90-100%)', 'A (80-89%)', 'B+ (70-79%)', 'B (60-69%)', 'C+ (50-59%)', 'C (40-49%)', 'D (33-39%)', 'F (<33%)'];
      const rawGrades   = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
      const barW = (W - 28) / scaleGrades.length;

      scaleGrades.forEach((label, i) => {
        const bx = 14 + i * barW;
        const gKey = rawGrades[i];
        const isCurrent = overallGrade === gKey;
        const col = GRADE_COLOR[gKey] || C.gray400;

        fillRect(doc, bx, y, barW - 1, 2.5, col);
        doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(isCurrent ? col[0] : C.gray600[0], isCurrent ? col[1] : C.gray600[1], isCurrent ? col[2] : C.gray600[2]);
        doc.text(label, bx + (barW - 1) / 2, y + 6.5, { align: 'center' });
      });

      y += 16;

      // ── 6. SIGNATURE BLOCK & FOOTER (Anchored near bottom) ──
      const sigY = Math.max(y, H - 28);
      const sigCols = ['Class Teacher', 'Exam Controller', 'Principal / Headmaster'];
      const sigColW = (W - 28 - 20) / sigCols.length;

      sigCols.forEach((title, idx) => {
        const sx = 14 + idx * (sigColW + 10);
        doc.setDrawColor(...C.gray400);
        doc.setLineWidth(0.3);
        doc.line(sx, sigY, sx + sigColW, sigY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...C.gray500);
        doc.text(title, sx + sigColW / 2, sigY + 5, { align: 'center' });
      });

      footer(doc, 1);
      doc.setFontSize(6.5);
      doc.setTextColor(...C.gray400);
      doc.text(
        'This is a computer-generated grade card. Issued for academic verification.',
        W / 2, H - 9, { align: 'center' }
      );

      doc.save(`${name.replace(/\s+/g, '_')}_${exam.exam_name.replace(/\s+/g, '_')}_Result.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingStudentPDFId(null);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PDF 2 — CLASS RESULT SHEET  (multi-class/all subjects, ranked, landscape A4/A3)
  // ════════════════════════════════════════════════════════════════════════════
  const generateClassResultPDF = async () => {
    if (!selectedClassId || !selectedSectionId || !students.length) return;
    setGeneratingClassPDF(true);
    try {
      const latestMarks  = await fetchLatestMarks();
      const schoolName   = schoolInfo?.name || 'School Management System';
      const selClass     = uniqueClasses.find(c => c.uuid === selectedClassId);
      const selSection   = sections.find(s => s.id === selectedSectionId);

      // Collect student IDs in current list
      const currentStudentIds = new Set(students.map(s => s.id));

      // Find all marks for these students
      const studentMarks = latestMarks.filter((m: any) => currentStudentIds.has(m.studentId));
      const markedSubjectIds = new Set(studentMarks.map((m: any) => m.subjectId as string));

      // Relevant classes: selectedClassId + any class where these students have marks
      const relevantClassIds = new Set<string>([selectedClassId]);
      exam.assignments.forEach(a => {
        if (a.class?.uuid && a.subject?.uuid && markedSubjectIds.has(a.subject.uuid)) {
          relevantClassIds.add(a.class.uuid);
        }
      });

      // Collect all subjects belonging to these relevant classes (in routine order),
      // merging same-named subjects across classes into a single column.
      interface MergedSubjectCol {
        subjectName: string;
        // All subjectIds that share this name (across different classes)
        subjectIds: string[];
        // All classNames that have this subject (for header label)
        classNames: string[];
      }

      const isMultiClass = relevantClassIds.size > 1;

      // Build ordered merged columns: one entry per unique subject name
      const mergedColMap = new Map<string, MergedSubjectCol>();

      Array.from(relevantClassIds).forEach(classId => {
        const asgns = exam.assignments
          .filter(a => a.class?.uuid === classId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const className = asgns[0]?.class?.name || uniqueClasses.find(c => c.uuid === classId)?.name || 'Class';

        asgns.forEach(a => {
          if (!a.subject?.uuid) return;
          const sName = (a.subject.name || 'Subject').trim();
          if (!mergedColMap.has(sName)) {
            mergedColMap.set(sName, { subjectName: sName, subjectIds: [], classNames: [] });
          }
          const col = mergedColMap.get(sName)!;
          if (!col.subjectIds.includes(a.subject.uuid)) col.subjectIds.push(a.subject.uuid);
          if (!col.classNames.includes(className)) col.classNames.push(className);
        });
      });

      const relevantCols: MergedSubjectCol[] = Array.from(mergedColMap.values());

      // Determine all class names involved (for deciding header labels)
      const allClassNames = Array.from(new Set(
        Array.from(relevantClassIds).map(cid => {
          const asgns = exam.assignments.filter(a => a.class?.uuid === cid);
          return asgns[0]?.class?.name || uniqueClasses.find(c => c.uuid === cid)?.name || 'Class';
        })
      ));

      // Column header labels:
      // - Single class: just subject name
      // - Multi-class, subject shared by all classes: just subject name
      // - Multi-class, subject unique to some classes: "SubjectName\n(Class1, Class2)"
      const subjectHeaderLabels = relevantCols.map(col => {
        if (!isMultiClass) return col.subjectName;
        if (col.classNames.length < allClassNames.length) {
          return `${col.subjectName}\n(${col.classNames.join(', ')})`;
        }
        return col.subjectName;
      });

      // ── Build per-student data ──────────────────────────────────────────────
      const studentData = students.map(st => {
        let totalObt = 0, totalMax = 0, hasAny = false;
        const markCells = relevantCols.map(col => {
          // Search across all subjectIds that belong to this merged column
          const m = latestMarks.find((x: any) =>
            x.studentId === st.id && col.subjectIds.includes(x.subjectId)
          );
          if (m && m.marksObtained != null) {
            totalObt += Number(m.marksObtained);
            totalMax += Number(m.totalMarks);
            hasAny = true;
            return { obtained: Number(m.marksObtained), total: Number(m.totalMarks) };
          }
          return null as null;
        });
        const pct = hasAny && totalMax > 0 ? (totalObt / totalMax) * 100 : null;
        return { st, markCells, totalObt, totalMax, pct, hasAny, passed: pct !== null && pct >= 33 };
      });

      // ── Drop columns where NO student has any mark ──────────────────────────
      // Find which column indices have at least one non-null mark
      const activeColIndices = relevantCols
        .map((_, ci) => ci)
        .filter(ci => studentData.some(sd => sd.markCells[ci] !== null));

      // Rebuild studentData with only the active columns, recalculating totals
      const prunedStudentData = studentData.map(sd => {
        let totalObt = 0, totalMax = 0, hasAny = false;
        const markCells = activeColIndices.map(ci => {
          const cell = sd.markCells[ci];
          if (cell) {
            totalObt += cell.obtained;
            totalMax += cell.total;
            hasAny = true;
          }
          return cell;
        });
        const pct = hasAny && totalMax > 0 ? (totalObt / totalMax) * 100 : null;
        return { st: sd.st, markCells, totalObt, totalMax, pct, hasAny, passed: pct !== null && pct >= 33 };
      });

      // Update relevantCols and headers to only active columns
      const activeRelevantCols   = activeColIndices.map(ci => relevantCols[ci]);
      const activeHeaderLabels   = activeColIndices.map(ci => subjectHeaderLabels[ci]);

      // Sort for ranking
      const sorted = [...prunedStudentData].sort((a, b) => {
        if (!a.hasAny && !b.hasAny) return 0;
        if (!a.hasAny) return 1;
        if (!b.hasAny) return -1;
        return (b.pct ?? 0) - (a.pct ?? 0);
      });
      let curRank = 1;
      const ranked = sorted.map((row, i) => {
        if (i > 0 && row.hasAny && sorted[i-1].hasAny && row.pct !== sorted[i-1].pct) curRank = i + 1;
        return { ...row, rank: row.hasAny ? curRank : null };
      });

      // ── Summary stats ───────────────────────────────────────────────────────
      const withMarks  = prunedStudentData.filter(s => s.hasAny);
      const avgPct     = withMarks.length ? withMarks.reduce((a,b) => a + (b.pct??0), 0) / withMarks.length : 0;
      const highestPct = withMarks.length ? Math.max(...withMarks.map(s => s.pct??0)) : 0;
      const lowestPct  = withMarks.length ? Math.min(...withMarks.map(s => s.pct??0)) : 0;
      const passCount  = withMarks.filter(s => s.passed).length;
      const passRate   = withMarks.length ? (passCount / withMarks.length) * 100 : 0;

      // ── Choose page format dynamically (A3 when many subjects) ─────────────
      const useA3 = activeRelevantCols.length > 9;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: useA3 ? 'a3' : 'a4' });
      const W   = doc.internal.pageSize.width;
      const H   = doc.internal.pageSize.height;

      // ── HEADER ─────────────────────────────────────────────────────────────
      fillRect(doc, 0, 0, W, 50, C.navy);
      fillRect(doc, 0, 0, W,  4, C.primary);
      fillRect(doc, 0, 50, W, 3, C.accent);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
      doc.setTextColor(...C.white);
      doc.text(schoolName, W / 2, 20, { align: 'center' });

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.setTextColor(147, 197, 253);
      doc.text('COMPREHENSIVE CLASS EXAMINATION RESULT SHEET', W / 2, 31, { align: 'center' });

      const displayedClasses = Array.from(new Set(activeRelevantCols.flatMap(c => c.classNames))).join(', ') || selClass?.name || '—';

      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.setTextColor(203, 213, 225);
      doc.text(
        `Class(es): ${displayedClasses}   •   Section: ${selSection?.name ?? '—'}   •   Exam: ${exam.exam_name}   •   ${fmtDate(exam.start_date)} – ${fmtDate(exam.end_date)}`,
        W / 2, 42, { align: 'center' }
      );

      // ── STATS CARDS ROW ─────────────────────────────────────────────────────
      let y = 60;
      type Stat = { label: string; value: string; color: RGB };
      const stats: Stat[] = [
        { label: 'Total Students',  value: students.length.toString(),                           color: C.primary },
        { label: 'Results Entered', value: `${withMarks.length} / ${students.length}`,          color: C.primary },
        { label: 'Class Average',   value: withMarks.length ? `${avgPct.toFixed(1)}%`    : '—', color: C.amber   },
        { label: 'Highest Score',   value: withMarks.length ? `${highestPct.toFixed(1)}%`: '—', color: C.green   },
        { label: 'Lowest Score',    value: withMarks.length ? `${lowestPct.toFixed(1)}%` : '—', color: C.orange  },
        { label: 'Pass Rate',       value: withMarks.length ? `${passRate.toFixed(1)}%`  : '—',
          color: passRate >= 80 ? C.green : passRate >= 50 ? C.amber : C.red },
        { label: 'Passed / Total',  value: `${passCount} / ${withMarks.length}`,                color: C.green   },
      ];
      const cardH   = 23;
      const cardGap = 3;
      const cardW   = (W - 28 - (stats.length - 1) * cardGap) / stats.length;
      stats.forEach(({ label, value, color }, i) => {
        const sx = 14 + i * (cardW + cardGap);
        fillRect(doc, sx + 0.7, y + 0.7, cardW, cardH, [215, 219, 227]);
        roundedFill(doc, sx, y, cardW, cardH, 2, C.white, C.gray200);
        roundedFill(doc, sx, y, cardW, 3, 1, color);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.setTextColor(...color);
        doc.text(value, sx + cardW / 2, y + 14, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8);
        doc.setTextColor(...C.gray500);
        doc.text(label.toUpperCase(), sx + cardW / 2, y + 20.5, { align: 'center' });
      });
      y += cardH + 7;

      // ── RESULTS TABLE ───────────────────────────────────────────────────────
      const numCols  = 3 + activeHeaderLabels.length + 3;
      const gradeCI  = numCols - 1;
      const pctCI    = numCols - 2;
      const totalCI  = numCols - 3;

      const tHead = ['Rank', 'Roll', 'Student Name', ...activeHeaderLabels, 'Total', '%', 'Grade'];
      const tBody = ranked.map(row => {
        const subCells = row.markCells.map(m => m ? `${m.obtained}/${m.total}` : '—');
        return [
          row.rank !== null ? String(row.rank) : '—',
          rollLabel(row.st),
          studentLabel(row.st),
          ...subCells,
          row.hasAny ? `${row.totalObt}/${row.totalMax}` : '—',
          row.pct   !== null ? `${row.pct.toFixed(1)}%` : '—',
          row.pct   !== null ? getGrade(row.pct) : '—',
        ];
      });

      // Dynamic subject column width — fills available space
      const fixedW      = 12 + 14 + 36 + 22 + 14 + 13;
      const availForSub = W - 28 - fixedW;
      const subColW     = activeRelevantCols.length > 0
        ? Math.max(18, Math.min(30, availForSub / activeRelevantCols.length))
        : 22;

      const colStyles: Record<number, object> = {
        0:         { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
        1:         { halign: 'center', cellWidth: 14 },
        2:         { halign: 'left',   cellWidth: 36, fontStyle: 'bold' },
        [totalCI]: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        [pctCI]:   { halign: 'center', cellWidth: 14 },
        [gradeCI]: { halign: 'center', cellWidth: 13, fontStyle: 'bold' },
      };
      for (let si = 0; si < activeRelevantCols.length; si++) {
        colStyles[3 + si] = { halign: 'center', cellWidth: subColW };
      }

      autoTable(doc, {
        head: [tHead],
        body: tBody,
        startY: y,
        styles: {
          fontSize: 8,
          cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
          lineColor: C.gray200,
          lineWidth: 0.2,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor:     C.navy  as [number, number, number],
          textColor:     C.white as [number, number, number],
          fontStyle:     'bold',
          fontSize:      7.5,
          halign:        'center',
          minCellHeight: isMultiClass ? 16 : 11,
          valign:        'middle',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
        columnStyles: colStyles,
        didParseCell: (data: any) => {
          if (data.section !== 'body') return;
          if (data.column.index === gradeCI) {
            const g = String(data.cell.raw);
            if (GRADE_COLOR[g]) {
              data.cell.styles.textColor = GRADE_COLOR[g];
              data.cell.styles.fontSize  = 9;
            }
          }
          if (data.column.index === 0) {
            const r = parseInt(String(data.cell.raw));
            if (r === 1) data.cell.styles.textColor = [161,  98,   7];
            if (r === 2) data.cell.styles.textColor = [100, 116, 139];
            if (r === 3) data.cell.styles.textColor = [180,  83,   9];
          }
          const ri = data.row.index;
          if (ri < ranked.length && ranked[ri].hasAny && !ranked[ri].passed) {
            if (data.column.index >= totalCI) {
              data.cell.styles.textColor = C.red;
              data.cell.styles.fontStyle = 'bold';
            }
          }
          if (data.column.index >= 3 && data.column.index < totalCI && String(data.cell.raw) === '\u2014') {
            data.cell.styles.textColor = C.gray400;
          }
        },
        didDrawPage: (data: any) => {
          if (data.pageNumber > 1) {
            fillRect(doc, 0, 0, W, 13, C.navy);
            fillRect(doc, 0, 13, W, 1.5, C.accent);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
            doc.setTextColor(...C.white);
            doc.text(
              `${schoolName}  \u2014  ${exam.exam_name}  \u2014  ${displayedClasses} / ${selSection?.name}  (continued)`,
              W / 2, 9, { align: 'center' }
            );
          }
          footer(doc, data.pageNumber);
        },
      });

      const lastY = (doc as any).lastAutoTable.finalY;

      // ── GRADE DISTRIBUTION ──────────────────────────────────────────────────
      const grades      = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
      const gradeRanges = ['\u226590%', '\u226580%', '\u226570%', '\u226560%', '\u226550%', '\u226540%', '\u226533%', '<33%'];
      if (lastY + 36 < H - 24) {
        const gdY = lastY + 9;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
        doc.setTextColor(...C.gray700);
        doc.text('GRADE DISTRIBUTION', 14, gdY);
        const gdW = (W - 28) / grades.length - 2;
        let gdx = 14;
        grades.forEach((g, gi) => {
          const cnt = withMarks.filter(s => s.pct !== null && getGrade(s.pct) === g).length;
          const col = GRADE_COLOR[g] || C.gray500;
          roundedFill(doc, gdx, gdY + 4, gdW, 20, 2.5, col);
          doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
          doc.setTextColor(...C.white);
          doc.text(String(cnt), gdx + gdW / 2, gdY + 16, { align: 'center' });
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
          doc.text(g, gdx + gdW / 2, gdY + 21.5, { align: 'center' });
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
          doc.text(gradeRanges[gi], gdx + gdW / 2, gdY + 25.5, { align: 'center' });
          gdx += gdW + 2;
        });
      }

      // ── SIGNATURE ROW ───────────────────────────────────────────────────────
      const sigY = H - 16;
      doc.setDrawColor(...C.gray200); doc.setLineWidth(0.4);
      doc.line(14, sigY - 4, W - 14, sigY - 4);
      const sigLabels = ['Class Teacher', 'Exam Controller', 'Principal / Head Master'];
      const sigLineW  = (W - 28 - 30) / sigLabels.length;
      sigLabels.forEach((lbl, i) => {
        const sx = 14 + i * (sigLineW + 15);
        doc.setDrawColor(...C.gray400); doc.setLineWidth(0.3);
        doc.line(sx, sigY + 1, sx + sigLineW, sigY + 1);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.setTextColor(...C.gray500);
        doc.text(lbl, sx + sigLineW / 2, sigY + 6.5, { align: 'center' });
      });

      const filename = `${exam.exam_name}_${selClass?.name}_${selSection?.name}_ClassResult.pdf`
        .replace(/\s+/g, '_');
      doc.save(filename);
    } catch(err) {
      console.error(err);
      alert('Failed to generate class result PDF. Please try again.');
    } finally {
      setGeneratingClassPDF(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-content" style={{ maxWidth: '72rem', height: '85vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Modal Header ── */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <FileText size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>{exam.exam_name}</h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                {fmtDate(exam.start_date)} — {fmtDate(exam.end_date)}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '0.5rem', borderRadius: '0.5rem' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--muted)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <X size={24} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 1.5rem', background: 'var(--background)' }}>
          {(['routine', 'results'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '1rem 1.5rem', border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
              color:        activeTab === tab ? 'var(--primary)' : 'var(--muted-foreground)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s',
            }}>
              {tab === 'routine' ? <Calendar size={18} /> : <Users size={18} />}
              {tab === 'routine' ? 'Exam Routine' : 'Manage Results'}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: 'var(--background)' }}>

          {/* ════ Exam Routine Tab ════ */}
          {activeTab === 'routine' && (
            <div className="animate-fade-in">
              {(!exam.assignments || !exam.assignments.length) ? (
                <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                  <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No routine found</p>
                  <p>There are no subjects assigned to this exam yet.</p>
                </div>
              ) : (
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)' }}>
                      <tr>
                        {['Date','Class','Subject','Examiner','Syllabus'].map(h => (
                          <th key={h} style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {exam.assignments.slice().sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>{fmtDate(a.date)}</td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{a.class?.name  || '—'}</td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>{a.subject?.name || '—'}</td>
                          <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>{a.examiner?.name || '—'}</td>
                          <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{a.syllabus || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════ Manage Results Tab ════ */}
          {activeTab === 'results' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--card)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Select Class</label>
                  <select className="input" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                    <option value="">— Choose Class —</option>
                    {uniqueClasses.map(c => <option key={c.uuid} value={c.uuid}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Select Section {loadingSections && <Loader2 size={12} className="animate-spin inline" />}
                  </label>
                  <select className="input" value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)} disabled={!selectedClassId || loadingSections}>
                    <option value="">— Choose Section —</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)' }}>Select Subject</label>
                  <select className="input" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} disabled={!selectedClassId}>
                    <option value="">— Choose Subject —</option>
                    {classSubjects.map(s => <option key={s.uuid} value={s.uuid}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Students table */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {!selectedClassId || !selectedSectionId || !selectedSubjectId ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Select Class, Section and Subject</p>
                    <p>Choose all three filters above to view students and manage their results.</p>
                  </div>
                ) : loadingStudents ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} className="animate-spin text-primary" style={{ marginBottom: '1rem' }} />
                    <p>Loading students…</p>
                  </div>
                ) : !students.length ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--muted-foreground)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No students found</p>
                    <p>There are no students enrolled in this section.</p>
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr>
                          {['Roll No.','Student Name','Marks Obtained','Total Marks','Actions'].map(h => (
                            <th key={h} style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(st => (
                          <tr key={st.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>{rollLabel(st)}</td>
                            <td style={{ padding: '1rem', fontSize: '0.95rem', fontWeight: 500, color: 'var(--foreground)' }}>{studentLabel(st)}</td>
                            <td style={{ padding: '1rem' }}>
                              <input type="number" className="input"
                                style={{ width: 100, padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--background)' }}
                                placeholder="0"
                                value={marksForm[st.id]?.marksObtained ?? ''}
                                onChange={e => setMarksForm(p => ({ ...p, [st.id]: { ...p[st.id], marksObtained: e.target.value } }))} />
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <input type="number" className="input"
                                style={{ width: 100, padding: '0.4rem 0.75rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--background)' }}
                                placeholder="100"
                                value={marksForm[st.id]?.totalMarks ?? ''}
                                onChange={e => setMarksForm(p => ({ ...p, [st.id]: { ...p[st.id], totalMarks: e.target.value } }))} />
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {/* View student result PDF — shows ALL classes */}
                              <button
                                onClick={() => generateStudentResultPDF(st)}
                                disabled={generatingStudentPDFId === st.id}
                                title="Download Student Result Card (all classes)"
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                  padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: 600,
                                  border: '1.5px solid var(--primary)', borderRadius: '0.5rem',
                                  background: 'transparent', color: 'var(--primary)',
                                  cursor: generatingStudentPDFId === st.id ? 'not-allowed' : 'pointer',
                                  opacity: generatingStudentPDFId === st.id ? 0.6 : 1,
                                  transition: 'background 0.18s, color 0.18s',
                                }}
                                onMouseEnter={e => { if (generatingStudentPDFId !== st.id) { e.currentTarget.style.background='var(--primary)'; e.currentTarget.style.color='white'; }}}
                                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--primary)'; }}>
                                {generatingStudentPDFId === st.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <Download size={13} />}
                                View Result
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Sticky footer */}
                    <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', bottom: 0, zIndex: 10 }}>
                      {/* Class Result PDF */}
                      <button
                        onClick={generateClassResultPDF}
                        disabled={generatingClassPDF || !students.length}
                        title="Download ranked class result sheet (all subjects)"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.6rem 1.25rem', fontSize: '0.88rem', fontWeight: 600,
                          border: '1.5px solid var(--primary)', borderRadius: '0.5rem',
                          background: 'transparent', color: 'var(--primary)',
                          cursor: generatingClassPDF || !students.length ? 'not-allowed' : 'pointer',
                          opacity: generatingClassPDF || !students.length ? 0.6 : 1,
                          transition: 'background 0.18s, color 0.18s',
                        }}
                        onMouseEnter={e => { if (!generatingClassPDF && students.length) { e.currentTarget.style.background='var(--primary)'; e.currentTarget.style.color='white'; }}}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--primary)'; }}>
                        {generatingClassPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Class Result PDF
                      </button>

                      {/* Submit All Marks */}
                      <button
                        className="btn"
                        onClick={handleSaveAllMarks}
                        disabled={isSavingAll}
                        style={{ padding: '0.6rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isSavingAll ? 'not-allowed' : 'pointer', opacity: isSavingAll ? 0.7 : 1 }}>
                        {isSavingAll && <Loader2 size={16} className="animate-spin" />}
                        Submit All Marks
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
