import { Student, StudentGrade, AttendanceStatus, MeetingSchedule, DosenProfile, QuizSubmission, SiakadDatabase, IndividualSubmission, UtsSubmission, GroupProject, UtsQuestion } from '../types';
import { DOSEN_SIGNATURE_BASE64 } from '../assets/dosenSignature';
import { getStudentPersonalizedFeedback } from './personalizedFeedback';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

/**
 * Generate and download a formatted Microsoft Word (.doc) academic grade recap (Kolektif)
 */
export function exportGradesToWord(options: {
  campusName: string;
  dosenFullName: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  academicYear?: string;
  students: Student[];
  grades: Record<string, StudentGrade>;
  attendance?: Record<number, Record<string, AttendanceStatus>>;
  meetings?: MeetingSchedule[];
}) {
  const {
    campusName,
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    students,
    grades,
  } = options;

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Build collective rows with personalized feedback column
  const tableRows = students.map((std, idx) => {
    const g = grades[std.id] || {
      attendanceScore: 100,
      attitudeScore: 85,
      individualScore: 85,
      utsScore: 85,
      uasScore: 85,
      groupScore: 85,
      finalScore: 88,
      letterGrade: 'A-',
    };

    const feedback = getStudentPersonalizedFeedback(std.name, std.nim, g.finalScore, std.topic, idx);

    return `
      <tr>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${idx + 1}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${std.nim}</td>
        <td style="padding:6px; border:1px solid #333; font-weight:bold;">${std.name}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${g.attendanceScore}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${g.attitudeScore}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${g.individualScore}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${g.utsScore ?? 85}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333;">${g.uasScore ?? g.groupScore ?? 85}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333; font-weight:bold; background-color:#e8f5e9;">${g.finalScore}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333; font-weight:bold;">${g.letterGrade}</td>
        <td style="text-align:center; padding:6px; border:1px solid #333; font-weight:bold; color:${g.finalScore >= 60 ? '#1b5e20' : '#b71c1c'};">
          ${g.finalScore >= 60 ? 'LULUS' : 'TIDAK LULUS'}
        </td>
        <td style="padding:6px; border:1px solid #333; font-size:9pt; line-height:1.3; color:#1a237e;">
          <em>"${feedback.quote}"</em> — <strong>${feedback.scholar}</strong>
        </td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Nilai Akhir Kolektif - ${courseTitle}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
        .campus-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .sub-header { font-size: 11pt; margin: 2px 0; }
        .doc-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-top: 14px; text-align: center; }
        .meta-table { width: 100%; margin: 12px 0; font-size: 10pt; }
        .meta-table td { padding: 3px 0; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-top: 10px; }
        .data-table th { background-color: #f0f0f0; border: 1px solid #333; padding: 6px 3px; text-align: center; font-weight: bold; }
        .signatures { margin-top: 35px; width: 100%; }
        .signatures td { vertical-align: top; font-size: 11pt; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="campus-name">${campusName || 'STAI JARINABI'}</div>
        <div class="sub-header">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
        <div class="sub-header">Laporan Kolektif Hasil Evaluasi Belajar Mahasiswa & Mutiara Kebijaksanaan</div>
      </div>

      <div class="doc-title">REKAPITULASI NILAI AKHIR KOLEKTIF KELAS</div>

      <table class="meta-table">
        <tr>
          <td width="20%"><strong>Mata Kuliah</strong></td>
          <td width="30%">: ${courseTitle} (${courseCode})</td>
          <td width="20%"><strong>Dosen Pengampu</strong></td>
          <td width="30%">: ${dosenFullName}</td>
        </tr>
        <tr>
          <td><strong>Bobot SKS</strong></td>
          <td>: ${sks} SKS</td>
          <td><strong>Semester / T.A</strong></td>
          <td>: ${semester}</td>
        </tr>
        <tr>
          <td><strong>Program Studi</strong></td>
          <td>: ${studyProgram}</td>
          <td><strong>Institusi Kampus</strong></td>
          <td>: ${campusName}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th width="3%">No</th>
            <th width="10%">NIM</th>
            <th width="18%">Nama Mahasiswa</th>
            <th width="6%">Presensi<br>(15%)</th>
            <th width="6%">Sikap<br>(10%)</th>
            <th width="7%">PPT/Mkl<br>(25%)</th>
            <th width="6%">UTS<br>(25%)</th>
            <th width="7%">UAS<br>(25%)</th>
            <th width="6%">Nilai<br>Akhir</th>
            <th width="5%">Grade</th>
            <th width="7%">Status</th>
            <th width="19%">Mutiara Kebijaksanaan & Tokoh</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div style="margin-top: 15px; font-size: 9pt; color: #555;">
        * Keterangan Skala Nilai: A (≥85), A- (80-84), B+ (75-79), B (70-74), B- (65-69), C+ (60-64), C (55-59), D (&lt;55).
      </div>

      <table class="signatures">
        <tr>
          <td width="55%">
            Mengetahui,<br>
            Ketua Program Studi ${studyProgram}<br><br><br><br><br>
            <strong>( .................................................... )</strong><br>
            NIDN. ...............................................
          </td>
          <td width="45%">
            Ditetapkan di: Kampus ${campusName}<br>
            Pada Tanggal: ${currentDateStr}<br><br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 6px 0;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="145" height="95" alt="Tanda Tangan Dosen Pengampu" style="display: block;" />
            </div>
            <strong>${dosenFullName}</strong><br>
            Dosen Pengampu ${campusName}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = courseTitle.replace(/[^a-zA-Z0-9]/g, '_');
  link.href = url;
  link.download = `Rekap_Nilai_Kolektif_${safeTitle}_${semester.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download formatted Microsoft Word (.doc) INDIVIDUAL student transcript (KHS)
 */
export function exportIndividualTranscriptWord(options: {
  campusName: string;
  dosenFullName: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  student: Student;
  grade: StudentGrade;
}) {
  const {
    campusName,
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    student,
    grade,
  } = options;

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const feedback = getStudentPersonalizedFeedback(student.name, student.nim, grade.finalScore, student.topic);

  const htmlContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Transkrip Hasil Studi Individu - ${student.name}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #111; margin: 25px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
        .campus-name { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 0; }
        .sub-header { font-size: 11pt; margin: 2px 0; }
        .doc-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin: 16px 0; text-align: center; }
        table.meta { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11pt; }
        table.meta td { padding: 4px 6px; }
        table.scores { width: 100%; border-collapse: collapse; font-size: 11pt; margin: 15px 0; }
        table.scores th { border: 1px solid #333; background-color: #f2f2f2; padding: 8px; text-align: center; font-weight: bold; }
        table.scores td { border: 1px solid #333; padding: 8px; }
        .box-quote { margin: 18px 0; padding: 12px 16px; border-left: 4px solid #1a237e; background-color: #f8f9fa; font-style: italic; }
        .box-eval { margin: 18px 0; padding: 12px 16px; border: 1px solid #c8e6c9; background-color: #f1f8e9; }
        .signatures { margin-top: 30px; width: 100%; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="campus-name">${campusName || 'STAI JARINABI'}</div>
        <div class="sub-header">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
        <div class="sub-header">Transkrip Nilai Akademik Resmi Mahasiswa (Kartu Hasil Studi Individu)</div>
      </div>

      <div class="doc-title">TRANSKRIP EVALUASI BELAJAR INDIVIDU</div>

      <table class="meta">
        <tr>
          <td width="22%"><strong>Nama Mahasiswa</strong></td>
          <td width="3%">:</td>
          <td width="35%"><strong>${student.name}</strong></td>
          <td width="20%"><strong>Mata Kuliah</strong></td>
          <td width="3%">:</td>
          <td width="17%">${courseTitle}</td>
        </tr>
        <tr>
          <td><strong>Nomor Induk (NIM)</strong></td>
          <td>:</td>
          <td>${student.nim}</td>
          <td><strong>Kode MK / SKS</strong></td>
          <td>:</td>
          <td>${courseCode} / ${sks} SKS</td>
        </tr>
        <tr>
          <td><strong>Program Studi</strong></td>
          <td>:</td>
          <td>${studyProgram}</td>
          <td><strong>Semester / TA</strong></td>
          <td>:</td>
          <td>${semester}</td>
        </tr>
        <tr>
          <td><strong>Topik RPS Mahasiswa</strong></td>
          <td>:</td>
          <td colspan="4">${student.topic || 'Filsafat Ilmu Pascasarjana MPI 1'}</td>
        </tr>
      </table>

      <h4 style="margin-top:15px; margin-bottom:5px; text-transform:uppercase;">I. Rincian Komponen Penilaian Akademik</h4>
      <table class="scores">
        <thead>
          <tr>
            <th width="8%">No</th>
            <th width="42%">Komponen Evaluasi Pembelajaran</th>
            <th width="15%">Bobot</th>
            <th width="15%">Nilai Angka</th>
            <th width="20%">Skor Terbobot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">1</td>
            <td>Presensi Kehadiran Kuliah (16 Sesi)</td>
            <td style="text-align:center;">15%</td>
            <td style="text-align:center;">${grade.attendanceScore}</td>
            <td style="text-align:center;">${(grade.attendanceScore * 0.15).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">2</td>
            <td>Sikap, Keaktifan, & Partisipasi Forum</td>
            <td style="text-align:center;">10%</td>
            <td style="text-align:center;">${grade.attitudeScore}</td>
            <td style="text-align:center;">${(grade.attitudeScore * 0.10).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">3</td>
            <td>Tugas Mandiri (Makalah & Presentasi PPT)</td>
            <td style="text-align:center;">25%</td>
            <td style="text-align:center;">${grade.individualScore}</td>
            <td style="text-align:center;">${(grade.individualScore * 0.25).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">4</td>
            <td>Ujian Tengah Semester (UTS - 5 Essay)</td>
            <td style="text-align:center;">25%</td>
            <td style="text-align:center;">${grade.utsScore ?? 85}</td>
            <td style="text-align:center;">${((grade.utsScore ?? 85) * 0.25).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">5</td>
            <td>Ujian Akhir Semester (UAS Video / Essay)</td>
            <td style="text-align:center;">25%</td>
            <td style="text-align:center;">${grade.uasScore ?? grade.groupScore ?? 85}</td>
            <td style="text-align:center;">${((grade.uasScore ?? grade.groupScore ?? 85) * 0.25).toFixed(1)}</td>
          </tr>
          <tr style="background-color:#e8f5e9; font-weight:bold;">
            <td colspan="3" style="text-align:right; padding:10px;">TOTAL NILAI AKHIR (SKALA 0-100):</td>
            <td style="text-align:center; font-size:14pt; color:#1b5e20;">${grade.finalScore}</td>
            <td style="text-align:center; font-size:14pt; color:#1b5e20;">GRADE: ${grade.letterGrade}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size:11pt; margin-top:8px;">
        Status Hasil Studi: <strong style="color:${grade.finalScore >= 60 ? '#1b5e20' : '#b71c1c'};">${grade.finalScore >= 60 ? 'LULUS DENGAN PREDIKAT MEMUASKAN' : 'TIDAK LULUS'}</strong>
      </div>

      <div class="box-eval">
        <strong style="color:#2e7d32; display:block; margin-bottom:4px;">II. Catatan Evaluasi & Karakteristik Akademik Dosen:</strong>
        <p style="margin:0; font-size:10.5pt; text-align:justify;">
          ${feedback.personalizedDescription}
        </p>
        <div style="margin-top:5px; font-size:10pt; font-weight:bold; color:#1b5e20;">
          Karakter Unggulan: ${feedback.characterTrait}
        </div>
      </div>

      <div class="box-quote">
        <strong style="color:#0d47a1; display:block; margin-bottom:3px;">III. Kata Mutiara Kebijaksanaan & Filsafat Ilmu:</strong>
        "${feedback.quote}"
        <div style="margin-top:4px; font-weight:bold; font-size:10pt; color:#333;">
          — ${feedback.scholar} <em>(${feedback.titleOrSource})</em>
        </div>
      </div>

      <table class="signatures">
        <tr>
          <td width="55%">
            Mahasiswa Yang Bersangkutan,<br><br><br><br><br>
            <strong>${student.name}</strong><br>
            NIM. ${student.nim}
          </td>
          <td width="45%">
            Ditetapkan di: Kampus ${campusName}<br>
            Pada Tanggal: ${currentDateStr}<br><br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 6px 0;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="145" height="95" alt="Tanda Tangan Dosen Pengampu" style="display: block;" />
            </div>
            <strong>${dosenFullName}</strong><br>
            Dosen Pengampu ${campusName}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
  link.href = url;
  link.download = `Transkrip_Nilai_${student.nim}_${safeName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download formatted Excel (.xls) academic grades recap
 * Supports both 'kolektif' (all students) and 'individu' (single student)
 */
export function exportGradesToExcel(options: {
  campusName: string;
  dosenFullName: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  students: Student[];
  grades: Record<string, StudentGrade>;
  scope?: 'kolektif' | 'individu';
  selectedStudent?: Student;
}) {
  const {
    campusName,
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    students,
    grades,
    scope = 'kolektif',
    selectedStudent,
  } = options;

  const targetStudents = scope === 'individu' && selectedStudent ? [selectedStudent] : students;

  const rowsHtml = targetStudents.map((std, idx) => {
    const g = grades[std.id] || {
      attendanceScore: 100,
      attitudeScore: 85,
      individualScore: 85,
      utsScore: 85,
      uasScore: 85,
      groupScore: 85,
      finalScore: 88,
      letterGrade: 'A-',
    };

    const feedback = getStudentPersonalizedFeedback(std.name, std.nim, g.finalScore, std.topic, idx);

    return `
      <tr>
        <td style="text-align:center; mso-number-format:'0';">${idx + 1}</td>
        <td style="text-align:center; mso-number-format:'\\@';">${std.nim}</td>
        <td style="font-weight:bold;">${std.name}</td>
        <td style="text-align:center;">${g.attendanceScore}</td>
        <td style="text-align:center;">${g.attitudeScore}</td>
        <td style="text-align:center;">${g.individualScore}</td>
        <td style="text-align:center;">${g.utsScore ?? 85}</td>
        <td style="text-align:center;">${g.uasScore ?? g.groupScore ?? 85}</td>
        <td style="text-align:center; font-weight:bold; background-color:#E8F5E9;">${g.finalScore}</td>
        <td style="text-align:center; font-weight:bold;">${g.letterGrade}</td>
        <td style="text-align:center; font-weight:bold; color:${g.finalScore >= 60 ? '#1B5E20' : '#B71C1C'};">
          ${g.finalScore >= 60 ? 'LULUS' : 'TIDAK LULUS'}
        </td>
        <td style="font-size:10pt;">${feedback.personalizedDescription}</td>
        <td style="font-size:10pt; font-style:italic;">"${feedback.quote}" (${feedback.scholar})</td>
      </tr>
    `;
  }).join('');

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Rekap Nilai</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        th { background-color: #15803d; color: #ffffff; font-weight: bold; border: 1px solid #000; padding: 6px; }
        td { border: 1px solid #ccc; padding: 5px; vertical-align: middle; }
      </style>
    </head>
    <body>
      <h2>${campusName.toUpperCase()} — PROGRAM STUDI ${studyProgram.toUpperCase()}</h2>
      <h3>REKAPITULASI NILAI AKADEMIK & MUTIARA KEBIJAKSANAAN MAHASISWA (${scope === 'individu' ? 'INDIVIDU' : 'KOLEKTIF'})</h3>
      <p>Mata Kuliah: <b>${courseTitle} (${courseCode})</b> | SKS: <b>${sks}</b> | Semester: <b>${semester}</b> | Dosen Pengampu: <b>${dosenFullName}</b></p>
      <table border="1">
        <thead>
          <tr>
            <th>No</th>
            <th>NIM</th>
            <th>Nama Mahasiswa</th>
            <th>Kehadiran (15%)</th>
            <th>Sikap (10%)</th>
            <th>Tugas PPT/Mkl (25%)</th>
            <th>UTS (25%)</th>
            <th>UAS (25%)</th>
            <th>Nilai Akhir</th>
            <th>Grade</th>
            <th>Status Kelulusan</th>
            <th>Deskripsi Evaluasi Akademik</th>
            <th>Kata Mutiara & Filosof Kebijaksanaan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = scope === 'individu' && selectedStudent
    ? `Nilai_${selectedStudent.nim}_${selectedStudent.name.replace(/[^a-zA-Z0-9]/g, '_')}.xls`
    : `Rekap_Nilai_Kolektif_${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Cartoon Quiz Game results to Word (.doc) or Excel (.xls)
 */
export function exportQuizRecap(options: {
  campusName: string;
  dosenFullName: string;
  courseTitle: string;
  submissions: QuizSubmission[];
  format: 'word' | 'excel';
}) {
  const { campusName, dosenFullName, courseTitle, submissions, format } = options;
  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Sort by who finished first (submittedAt asc)
  const sorted = [...submissions].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  const rows = sorted.map((sub, idx) => `
    <tr>
      <td style="text-align:center; padding:6px; border:1px solid #333;">${idx + 1}</td>
      <td style="text-align:center; padding:6px; border:1px solid #333; font-weight:bold; color:#b45309;">
        ${idx === 0 ? '🥇 Ke-1 Selesai' : idx === 1 ? '🥈 Ke-2 Selesai' : idx === 2 ? '🥉 Ke-3 Selesai' : `Ke-${idx + 1} Selesai`}
      </td>
      <td style="padding:6px; border:1px solid #333; font-weight:bold;">${sub.studentName}</td>
      <td style="text-align:center; padding:6px; border:1px solid #333; font-weight:bold; font-size:11pt; background-color:#fef3c7;">
        ${sub.score} / 100
      </td>
      <td style="text-align:center; padding:6px; border:1px solid #333;">
        ${sub.correctCount} / ${sub.totalQuestions}
      </td>
      <td style="text-align:center; padding:6px; border:1px solid #333;">
        ${Math.floor((sub.timeTakenSeconds || 0) / 60)}m ${(sub.timeTakenSeconds || 0) % 60}s
      </td>
      <td style="text-align:center; padding:6px; border:1px solid #333;">
        ${sub.cameraVerified ? '✅ Terverifikasi Kamera' : 'Non-Kamera'}
      </td>
      <td style="padding:6px; border:1px solid #333; font-size:9pt;">
        ${new Date(sub.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  `).join('');

  if (format === 'excel') {
    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <style>
          th { background-color: #d97706; color: #fff; font-weight: bold; border: 1px solid #000; padding: 6px; }
          td { border: 1px solid #ccc; padding: 5px; }
        </style>
      </head>
      <body>
        <h2>REKAPITULASI HASIL GAME KUIS CERDAS CERMAT ANIMASI KARTUN RPS</h2>
        <p>Mata Kuliah: <b>${courseTitle}</b> | Kampus: <b>${campusName}</b> | Dosen: <b>${dosenFullName}</b></p>
        <table border="1">
          <thead>
            <tr>
              <th>No</th>
              <th>Urutan Selesai</th>
              <th>Nama Mahasiswa</th>
              <th>Skor Game (0-100)</th>
              <th>Jawaban Benar</th>
              <th>Durasi Waktu</th>
              <th>Pengawasan Kamera</th>
              <th>Waktu Pengiriman</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Kuis_Game_${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // Word Format
  const wordHtml = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Rekap Hasil Kuis Kartun - ${courseTitle}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
        .doc-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin: 12px 0; text-align: center; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 10px; }
        th { background-color: #fef3c7; border: 1px solid #333; padding: 6px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin:0; text-transform:uppercase;">${campusName}</h2>
        <div>PORTAL DOSEN PENGAMPU — EVALUASI GAME KUIS KARTUN INTERAKTIF</div>
      </div>
      <div class="doc-title">REKAPITULASI HASIL KUIS GAME KARTUN RPS (LEADERBOARD KECEPATAN & SKOR)</div>
      <p>Mata Kuliah: <strong>${courseTitle}</strong> | Dosen: <strong>${dosenFullName}</strong> | Tanggal Cetak: ${currentDateStr}</p>
      <table>
        <thead>
          <tr>
            <th width="5%">No</th>
            <th width="15%">Urutan Selesai</th>
            <th width="26%">Nama Mahasiswa</th>
            <th width="12%">Skor Kuis</th>
            <th width="12%">Jawaban Benar</th>
            <th width="12%">Durasi Waktu</th>
            <th width="18%">Pengawasan Kamera</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 30px; text-align: right;">
        ${campusName}, ${currentDateStr}<br>
        Dosen Pengampu,<br>
        <div style="margin: 6px 0;">
          <img src="${DOSEN_SIGNATURE_BASE64}" width="140" height="90" alt="TTD Dosen" />
        </div>
        <strong>${dosenFullName}</strong>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rekap_Kuis_Game_${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download formatted RPS Document (.doc Word format)
 */
export function exportRpsToWord(profile: DosenProfile, meetings: MeetingSchedule[], rpsRawText?: string) {
  const campus = profile.campusName || 'STAI Jarinabi';
  const dosen = profile.name || (profile.dosenName ? `${profile.dosenName}${profile.dosenTitle ? ', ' + profile.dosenTitle : ''}` : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');

  const meetingRows = meetings.map(m => `
    <tr>
      <td style="text-align:center; padding:6px; border:1px solid #333; font-weight:bold;">${m.meetingNumber}</td>
      <td style="padding:6px; border:1px solid #333;">${m.dateStr}</td>
      <td style="padding:6px; border:1px solid #333; font-weight:bold;">${m.title}</td>
      <td style="padding:6px; border:1px solid #333;">${m.description}</td>
      <td style="padding:6px; border:1px solid #333; text-align:center; font-weight:bold; color:#004d40;">
        ${m.presentationFormat === 'kelompok' ? 'Kelompok' : 'Individu'}
      </td>
      <td style="padding:6px; border:1px solid #333;">
        ${m.presenters && m.presenters.length > 0 ? m.presenters.join(', ') : '-'}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>RPS ${profile.courseTitle}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; margin: 20px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .title { font-size: 15pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 15px 0 10px; }
        table.meta { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.meta td { padding: 4px 6px; }
        table.grid { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 10px; }
        table.grid th { border: 1px solid #333; background: #e0e0e0; padding: 6px; text-align: center; }
        .section-title { font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; border-bottom: 1px solid #888; padding-bottom: 3px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin:0; text-transform:uppercase;">${campus}</h2>
        <div style="font-size:11pt;">PROGRAM STUDI ${profile.studyProgram.toUpperCase()}</div>
        <div style="font-size:10pt;">KAMPUS ${campus.toUpperCase()} • TAHUN AKADEMIK 2026/2027</div>
      </div>

      <div class="title">RENCANA PEMBELAJARAN SEMESTER (RPS)</div>

      <table class="meta">
        <tr>
          <td width="22%"><strong>Mata Kuliah</strong></td>
          <td width="3%">:</td>
          <td width="35%">${profile.courseTitle}</td>
          <td width="18%"><strong>Kode / SKS</strong></td>
          <td width="3%">:</td>
          <td width="19%">${profile.courseCode} / ${profile.sks} SKS</td>
        </tr>
        <tr>
          <td><strong>Dosen Pengampu</strong></td>
          <td>:</td>
          <td><strong>${dosen}</strong></td>
          <td><strong>Semester</strong></td>
          <td>:</td>
          <td>${profile.semester}</td>
        </tr>
        <tr>
          <td><strong>Program Studi</strong></td>
          <td>:</td>
          <td>${profile.studyProgram}</td>
          <td><strong>Kampus</strong></td>
          <td>:</td>
          <td>${campus}</td>
        </tr>
      </table>

      <div class="section-title">I. Deskripsi Mata Kuliah</div>
      <p>${profile.description || 'Mata kuliah ini dirancang untuk membekali mahasiswa dengan wawasan mendalam, metodologi ilmiah, dan kemampuan analisis kritis.'}</p>

      <div class="section-title">II. Capaian Pembelajaran Lulusan (CPL) & CPMK</div>
      <ul>
        <li><strong>Sikap:</strong> Menjunjung tinggi nilai kemanusiaan, etika keilmuan, dan integritas akademik dalam riset.</li>
        <li><strong>Pengetahuan:</strong> Menguasai konsep dasar ontologi, epistemologi, dan aksiologi keilmuan pendidikan Islam.</li>
        <li><strong>Keterampilan Umum:</strong> Mampu menyusun makalah ilmiah, presentasi PPT, dan memanfaatkan kecerdasan buatan (Generative AI) secara amanah.</li>
        <li><strong>Keterampilan Khusus:</strong> Mampu memproduksi video edukasi ilmiah kolaboratif berbasis AI.</li>
      </ul>

      <div class="section-title">III. Bobot & Sistem Evaluasi Pembelajaran</div>
      <ul>
        <li>Presensi Kehadiran Kuliah (16 Pertemuan): <strong>15%</strong></li>
        <li>Sikap, Keaktifan, & Partisipasi Diskusi: <strong>10%</strong></li>
        <li>Tugas Mandiri (Makalah & Presentasi PPT): <strong>25%</strong></li>
        <li>Ujian Tengah Semester (UTS - 5 Soal Esai Kritis): <strong>25%</strong></li>
        <li>Ujian Akhir Semester (UAS - Proyek Video AI Kelompok / Essay): <strong>25%</strong></li>
      </ul>

      <div class="section-title">IV. Matriks Rincian 16 Kali Pertemuan</div>
      <table class="grid">
        <thead>
          <tr>
            <th width="6%">Ptm</th>
            <th width="18%">Hari / Tanggal</th>
            <th width="28%">Materi / Pokok Bahasan</th>
            <th width="24%">Bentuk Pembelajaran & Uraian</th>
            <th width="10%">Format Tugas</th>
            <th width="14%">Pemateri / Presenter</th>
          </tr>
        </thead>
        <tbody>
          ${meetingRows}
        </tbody>
      </table>

      <div style="margin-top: 30px; width: 100%;">
        <table style="width: 100%;">
          <tr>
            <td width="55%"></td>
            <td width="45%" style="text-align: left;">
              ${campus}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
              Dosen Pengampu Mata Kuliah,<br>
              <div style="margin: 6px 0;">
                <img src="${DOSEN_SIGNATURE_BASE64}" width="145" height="95" alt="Tanda Tangan Dosen" style="display: block;" />
              </div>
              <strong>${dosen}</strong><br>
              Dosen Pengampu ${campus}
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `RPS_${profile.courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${campus.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExportAttendanceOptions {
  campusName?: string;
  dosenFullName: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  academicYear?: string;
  students: Student[];
  meetings?: MeetingSchedule[];
  attendance: Record<number, Record<string, AttendanceStatus>>;
  grades?: Record<string, StudentGrade>;
}

/**
 * Generate official printable HTML for Attendance Recap (16 Meetings)
 */
export function generateAttendancePrintHtml(options: ExportAttendanceOptions): string {
  const {
    campusName = 'STAI JARINABI',
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    academicYear = 'T.A 2026/2027',
    students = [],
    meetings = [],
    attendance = {},
    grades = {},
  } = options;

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate stats for footer per meeting (1..16)
  const meetingStats = Array.from({ length: 16 }, (_, i) => {
    const mNum = i + 1;
    let hCount = 0;
    let iCount = 0;
    let sCount = 0;
    let aCount = 0;
    students.forEach((s) => {
      const status = attendance[mNum]?.[s.id];
      if (status === 'H') hCount++;
      else if (status === 'I') iCount++;
      else if (status === 'S') sCount++;
      else if (status === 'A') aCount++;
    });
    const pct = students.length > 0 ? Math.round((hCount / students.length) * 100) : 0;
    return { mNum, hCount, iCount, sCount, aCount, pct };
  });

  // Build table rows for each student
  const studentRows = students.map((std, idx) => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;

    const cellsHtml = Array.from({ length: 16 }, (_, i) => {
      const mNum = i + 1;
      const status = attendance[mNum]?.[std.id] || '-';
      if (status === 'H') hadir++;
      else if (status === 'I') izin++;
      else if (status === 'S') sakit++;
      else if (status === 'A') alfa++;

      let badgeBg = '#f8fafc';
      let badgeColor = '#64748b';
      let text = status === 'BELUM' ? '-' : status;

      if (status === 'H') {
        badgeBg = '#d1fae5';
        badgeColor = '#065f46';
      } else if (status === 'I') {
        badgeBg = '#dbeafe';
        badgeColor = '#1e40af';
      } else if (status === 'S') {
        badgeBg = '#fef3c7';
        badgeColor = '#92400e';
      } else if (status === 'A') {
        badgeBg = '#fee2e2';
        badgeColor = '#991b1b';
      }

      return `<td style="text-align:center; padding:4px 2px; border:1px solid #cbd5e1; background-color:${badgeBg}; color:${badgeColor}; font-weight:bold; font-size:8.5pt;">${text}</td>`;
    }).join('');

    const totalFilled = hadir + izin + sakit + alfa;
    const weightedPresence = hadir + 0.8 * izin + 0.8 * sakit;
    const pctAttendance = Math.round((hadir / 16) * 100);
    const scoreVal = grades[std.id]?.attendanceScore ?? (totalFilled > 0 ? Math.min(100, Math.round((weightedPresence / Math.max(1, totalFilled)) * 100)) : 100);
    const isLulus = pctAttendance >= 75 || scoreVal >= 75;

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-size:8.5pt;">${idx + 1}</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-family:monospace; font-size:8.5pt;">${std.nim}</td>
        <td style="padding:5px 6px; border:1px solid #cbd5e1; font-weight:600; font-size:8.5pt; white-space:nowrap;">${std.name}</td>
        ${cellsHtml}
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-weight:bold; color:#065f46; background-color:#ecfdf5; font-size:8.5pt;">${hadir}</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-weight:bold; color:#1e40af; background-color:#eff6ff; font-size:8.5pt;">${izin}</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-weight:bold; color:#92400e; background-color:#fffbeb; font-size:8.5pt;">${sakit}</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-weight:bold; color:#991b1b; background-color:#fef2f2; font-size:8.5pt;">${alfa}</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-weight:bold; font-size:8.5pt;">${pctAttendance}%</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #cbd5e1; font-weight:bold; color:#064e3b; background-color:#f0fdf4; font-size:9pt;">${scoreVal}</td>
        <td style="text-align:center; padding:5px 4px; border:1px solid #cbd5e1; font-size:7.5pt; font-weight:bold; color:${isLulus ? '#047857' : '#b91c1c'}; white-space:nowrap;">
          ${isLulus ? 'MEMENUHI' : 'KURANG'}
        </td>
      </tr>
    `;
  }).join('');

  // Footer summary cells for each meeting
  const footerPresenceCells = meetingStats.map(m => `
    <td style="text-align:center; padding:4px 2px; border:1px solid #cbd5e1; font-weight:bold; background-color:#e2e8f0; color:#0f172a; font-size:8pt;">
      ${m.hCount}
    </td>
  `).join('');

  const footerPctCells = meetingStats.map(m => `
    <td style="text-align:center; padding:4px 2px; border:1px solid #cbd5e1; font-weight:bold; background-color:#f1f5f9; color:#064e3b; font-size:7.5pt;">
      ${m.pct}%
    </td>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Presensi Kehadiran Mahasiswa (16 Pertemuan) - ${courseTitle}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 10mm 10mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 9pt;
          line-height: 1.3;
          color: #0f172a;
          margin: 0;
          padding: 12px;
          background-color: #ffffff;
        }
        .header-kop {
          text-align: center;
          border-bottom: 2.5px double #0f172a;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .campus-name {
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0;
          color: #064e3b;
        }
        .kop-subtitle {
          font-size: 9.5pt;
          font-weight: 600;
          margin: 2px 0;
          color: #334155;
        }
        .kop-address {
          font-size: 8pt;
          color: #64748b;
          margin-top: 1px;
        }
        .doc-title-container {
          text-align: center;
          margin: 10px 0 12px 0;
        }
        .doc-title {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          text-decoration: underline;
          letter-spacing: 0.3px;
          margin: 0;
          color: #0f172a;
        }
        .doc-subtitle {
          font-size: 8.5pt;
          color: #475569;
          margin-top: 2px;
        }
        .meta-table {
          width: 100%;
          margin-bottom: 10px;
          font-size: 8.5pt;
          border-collapse: collapse;
        }
        .meta-table td {
          padding: 2px 4px;
          vertical-align: top;
        }
        .recap-grid {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin-top: 4px;
        }
        .recap-grid th {
          background-color: #064e3b;
          color: #ffffff;
          border: 1px solid #0f172a;
          padding: 5px 3px;
          font-weight: bold;
          text-align: center;
          font-size: 8pt;
        }
        .recap-grid td {
          border: 1px solid #cbd5e1;
        }
        .legend-box {
          margin-top: 12px;
          padding: 6px 10px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 8pt;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .signatures {
          margin-top: 20px;
          width: 100%;
          page-break-inside: avoid;
        }
        .signatures td {
          vertical-align: top;
          font-size: 9pt;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="position:sticky; top:0; left:0; right:0; background:linear-gradient(135deg, #064e3b, #0f766e); color:#ffffff; padding:10px 16px; margin:-12px -12px 14px -12px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 3px 10px rgba(0,0,0,0.18); z-index:9999; font-family:system-ui, -apple-system, sans-serif; border-bottom:2px solid #059669;">
        <div style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#34d399;"></span>
          <span>Pratinjau Resmi: Rekapitulasi Presensi Kehadiran Mahasiswa (A4 Landscape)</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button onclick="window.print()" style="background:#10b981; hover:background:#059669; color:#ffffff; border:none; padding:7px 18px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 3px rgba(0,0,0,0.2);">
            🖨️ Cetak / Simpan PDF Sekarang
          </button>
          <button onclick="window.close()" style="background:rgba(255,255,255,0.18); color:#ffffff; border:none; padding:7px 14px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer;">
            Tutup
          </button>
        </div>
      </div>

      <div class="header-kop">
        <div class="campus-name">${campusName || 'STAI JARINABI'}</div>
        <div class="kop-subtitle">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
        <div class="kop-address">Daftar Rekapitulasi Presensi & Evaluasi Kehadiran Mahasiswa 16 Kali Pertemuan</div>
      </div>

      <div class="doc-title-container">
        <h1 class="doc-title">REKAPITULASI PRESENSI KEHADIRAN MAHASISWA PERTEMUAN 1 S/D 16</h1>
        <div class="doc-subtitle">Semester: ${semester} • Tahun Akademik: ${academicYear}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td width="15%"><strong>Mata Kuliah</strong></td>
          <td width="1%">:</td>
          <td width="34%">${courseTitle} (${courseCode})</td>
          <td width="15%"><strong>Dosen Pengampu</strong></td>
          <td width="1%">:</td>
          <td width="34%">${dosenFullName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}</td>
        </tr>
        <tr>
          <td><strong>Bobot SKS</strong></td>
          <td>:</td>
          <td>${sks} SKS</td>
          <td><strong>Program Studi / Kelas</strong></td>
          <td>:</td>
          <td>${studyProgram}</td>
        </tr>
        <tr>
          <td><strong>Total Pertemuan</strong></td>
          <td>:</td>
          <td>16 Pertemuan (P1-P7: Kuliah, P8: UTS, P9-P15: Kuliah, P16: UAS)</td>
          <td><strong>Bobot Nilai Presensi</strong></td>
          <td>:</td>
          <td><strong>15%</strong> (Syarat Mengikuti UAS: Minimal 75%)</td>
        </tr>
      </table>

      <table class="recap-grid">
        <thead>
          <tr>
            <th rowspan="2" width="2.5%">No</th>
            <th rowspan="2" width="7.5%">NIM</th>
            <th rowspan="2" width="18%">Nama Mahasiswa</th>
            <th colspan="16">Pertemuan Perkuliahan (P1 s/d P16)</th>
            <th colspan="4" width="9%">Rekapitulasi</th>
            <th rowspan="2" width="4.5%">% Hdr</th>
            <th rowspan="2" width="5%">Nilai (15%)</th>
            <th rowspan="2" width="6.5%">Status</th>
          </tr>
          <tr>
            <th width="2.4%">P1</th>
            <th width="2.4%">P2</th>
            <th width="2.4%">P3</th>
            <th width="2.4%">P4</th>
            <th width="2.4%">P5</th>
            <th width="2.4%">P6</th>
            <th width="2.4%">P7</th>
            <th width="2.8%" style="background-color:#047857;">P8<br><span style="font-size:6.5pt;">UTS</span></th>
            <th width="2.4%">P9</th>
            <th width="2.4%">P10</th>
            <th width="2.4%">P11</th>
            <th width="2.4%">P12</th>
            <th width="2.4%">P13</th>
            <th width="2.4%">P14</th>
            <th width="2.4%">P15</th>
            <th width="2.8%" style="background-color:#047857;">P16<br><span style="font-size:6.5pt;">UAS</span></th>
            <th width="2.2%" style="background-color:#065f46;">H</th>
            <th width="2.2%" style="background-color:#1e40af;">I</th>
            <th width="2.2%" style="background-color:#92400e;">S</th>
            <th width="2.2%" style="background-color:#991b1b;">A</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold; background-color:#e2e8f0;">
            <td colspan="3" style="text-align:right; padding:5px 6px; border:1px solid #cbd5e1; font-size:8pt;">
              TOTAL HADIR KELAS:
            </td>
            ${footerPresenceCells}
            <td colspan="7" style="border:1px solid #cbd5e1; font-size:7.5pt; text-align:center; color:#334155;">
              Roster 16 Sesi Lengkap
            </td>
          </tr>
          <tr style="font-weight:bold; background-color:#f1f5f9;">
            <td colspan="3" style="text-align:right; padding:4px 6px; border:1px solid #cbd5e1; font-size:8pt;">
              % KEHADIRAN SESI:
            </td>
            ${footerPctCells}
            <td colspan="7" style="border:1px solid #cbd5e1; font-size:7.5pt; text-align:center; color:#065f46;">
              Standar Kelulusan Presensi ≥ 75%
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="legend-box">
        <div>
          <strong>Keterangan:</strong> 
          <span style="color:#065f46; font-weight:bold; margin-left:8px;">H = Hadir</span> |
          <span style="color:#1e40af; font-weight:bold; margin-left:4px;">I = Izin</span> |
          <span style="color:#92400e; font-weight:bold; margin-left:4px;">S = Sakit</span> |
          <span style="color:#991b1b; font-weight:bold; margin-left:4px;">A = Alfa</span> |
          <span style="color:#64748b; margin-left:4px;">- = Belum Terisi</span>
        </div>
        <div style="font-size:7.5pt; color:#64748b;">
          * Ketentuan Akademik: Mahasiswa berhak mengikuti UAS jika persentase kehadiran sekurang-kurangnya 75% dari total 16 pertemuan.
        </div>
      </div>

      <table class="signatures">
        <tr>
          <td width="42%" style="text-align:center; vertical-align:top;">
            Mengetahui,<br>
            Ketua Program Studi ${studyProgram}<br><br><br><br><br>
            <strong><u>Dr. H. Ahmad Masrukin, M.Pd.I</u></strong><br>
            NIDN: 2115047801
          </td>
          <td width="16%"></td>
          <td width="42%" style="text-align:center; vertical-align:top;">
            Ditetapkan di: Pasuruan, ${currentDateStr}<br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 4px auto; text-align:center;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="140" height="90" alt="Tanda Tangan Dosen" style="display:inline-block; margin: 2px 0;" />
            </div>
            <div style="display:inline-block; border:1px solid #059669; background-color:#ecfdf5; color:#065f46; font-size:7pt; font-weight:bold; padding:2px 8px; border-radius:4px; margin-bottom:4px; letter-spacing:0.3px;">
              ✓ DITANDATANGANI SECARA ELEKTRONIK • SIAKAD DIGITAL
            </div><br>
            <strong><u>${dosenFullName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}</u></strong><br>
            NIP: 198806282015032001
          </td>
        </tr>
      </table>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch (e) {}
          }, 350);
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Export Attendance Recap (16 Meetings) to Microsoft Word (.doc)
 */
export function exportAttendanceToWord(options: ExportAttendanceOptions) {
  const {
    campusName = 'STAI JARINABI',
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    academicYear = 'T.A 2026/2027',
    students = [],
    attendance = {},
    grades = {},
  } = options;

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const studentRows = students.map((std, idx) => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;

    const cellsHtml = Array.from({ length: 16 }, (_, i) => {
      const mNum = i + 1;
      const status = attendance[mNum]?.[std.id] || '-';
      if (status === 'H') hadir++;
      else if (status === 'I') izin++;
      else if (status === 'S') sakit++;
      else if (status === 'A') alfa++;

      let bg = '#ffffff';
      let fg = '#333333';
      if (status === 'H') { bg = '#d1fae5'; fg = '#065f46'; }
      else if (status === 'I') { bg = '#dbeafe'; fg = '#1e40af'; }
      else if (status === 'S') { bg = '#fef3c7'; fg = '#92400e'; }
      else if (status === 'A') { bg = '#fee2e2'; fg = '#991b1b'; }

      return `<td style="text-align:center; padding:4px 2px; border:1px solid #333333; background-color:${bg}; color:${fg}; font-weight:bold; font-size:8pt;">${status === 'BELUM' ? '-' : status}</td>`;
    }).join('');

    const totalFilled = hadir + izin + sakit + alfa;
    const weightedPresence = hadir + 0.8 * izin + 0.8 * sakit;
    const pctAttendance = Math.round((hadir / 16) * 100);
    const scoreVal = grades[std.id]?.attendanceScore ?? (totalFilled > 0 ? Math.min(100, Math.round((weightedPresence / Math.max(1, totalFilled)) * 100)) : 100);
    const isLulus = pctAttendance >= 75 || scoreVal >= 75;

    return `
      <tr>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-size:8pt;">${idx + 1}</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-size:8pt;">${std.nim}</td>
        <td style="padding:4px 6px; border:1px solid #333333; font-weight:bold; font-size:8pt;">${std.name}</td>
        ${cellsHtml}
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; color:#065f46; background-color:#e8f5e9; font-size:8pt;">${hadir}</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; color:#1e40af; background-color:#e3f2fd; font-size:8pt;">${izin}</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; color:#92400e; background-color:#fff8e1; font-size:8pt;">${sakit}</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; color:#991b1b; background-color:#ffebee; font-size:8pt;">${alfa}</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; font-size:8pt;">${pctAttendance}%</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; background-color:#e8f5e9; font-size:8.5pt;">${scoreVal}</td>
        <td style="text-align:center; padding:4px; border:1px solid #333333; font-weight:bold; font-size:7.5pt; color:${isLulus ? '#1b5e20' : '#b71c1c'};">
          ${isLulus ? 'MEMENUHI' : 'KURANG'}
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Presensi Kehadiran 16 Pertemuan - ${courseTitle}</title>
      <style>
        @page Section1 {
          size: 841.9pt 595.3pt;
          mso-page-orientation: landscape;
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; color: #111; line-height: 1.3; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 12px; }
        .campus-name { font-size: 15pt; font-weight: bold; text-transform: uppercase; margin: 0; color: #064e3b; }
        .doc-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin-top: 10px; text-align: center; }
        .meta-table { width: 100%; margin: 8px 0; font-size: 9pt; }
        .meta-table td { padding: 2px 0; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 8px; }
        .data-table th { background-color: #064e3b; color: #ffffff; border: 1px solid #333; padding: 4px 2px; text-align: center; font-weight: bold; }
        .signatures { margin-top: 25px; width: 100%; }
        .signatures td { vertical-align: top; font-size: 9.5pt; }
      </style>
    </head>
    <body>
      <div class="Section1">
        <div class="header">
          <div class="campus-name">${campusName || 'STAI JARINABI'}</div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 2px;">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
          <div style="font-size: 8.5pt; color: #555;">Daftar Rekapitulasi Presensi Kehadiran Mahasiswa Lengkap Pertemuan 1 sampai 16</div>
        </div>

        <div class="doc-title">REKAPITULASI PRESENSI MAHASISWA (16 PERTEMUAN LENGKAP)</div>
        <div style="text-align: center; font-size: 9pt; margin-bottom: 8px;">Semester: ${semester} • ${academicYear}</div>

        <table class="meta-table">
          <tr>
            <td width="15%"><strong>Mata Kuliah</strong></td>
            <td width="1%">:</td>
            <td width="34%">${courseTitle} (${courseCode})</td>
            <td width="15%"><strong>Dosen Pengampu</strong></td>
            <td width="1%">:</td>
            <td width="34%">${dosenFullName}</td>
          </tr>
          <tr>
            <td><strong>Bobot SKS</strong></td>
            <td>:</td>
            <td>${sks} SKS</td>
            <td><strong>Program Studi</strong></td>
            <td>:</td>
            <td>${studyProgram}</td>
          </tr>
          <tr>
            <td><strong>Bobot Presensi</strong></td>
            <td>:</td>
            <td>15% Nilai Kumulatif Akhir</td>
            <td><strong>Standar Kehadiran</strong></td>
            <td>:</td>
            <td>Minimal 75% untuk Mengikuti UAS</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th rowspan="2" width="3%">No</th>
              <th rowspan="2" width="8%">NIM</th>
              <th rowspan="2" width="18%">Nama Mahasiswa</th>
              <th colspan="16">Pertemuan 1 s/d 16</th>
              <th colspan="4" width="10%">Rekap</th>
              <th rowspan="2" width="5%">% Hdr</th>
              <th rowspan="2" width="5%">Nilai (15%)</th>
              <th rowspan="2" width="7%">Status</th>
            </tr>
            <tr>
              <th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>P5</th><th>P6</th><th>P7</th><th>P8</th>
              <th>P9</th><th>P10</th><th>P11</th><th>P12</th><th>P13</th><th>P14</th><th>P15</th><th>P16</th>
              <th>H</th><th>I</th><th>S</th><th>A</th>
            </tr>
          </thead>
          <tbody>
            ${studentRows}
          </tbody>
        </table>

        <div style="margin-top: 10px; font-size: 8pt; color: #444; border: 1px solid #ccc; padding: 5px;">
          <strong>Keterangan Status:</strong> H = Hadir, I = Izin, S = Sakit, A = Alfa. Persentase dihitung dari total 16 pertemuan resmi.
        </div>

        <table class="signatures">
          <tr>
            <td width="45%">
              Mengetahui,<br>
              Ketua Program Studi ${studyProgram}<br><br><br><br>
              <strong><u>Dr. H. Ahmad Masrukin, M.Pd.I</u></strong><br>
              NIDN: 2115047801
            </td>
            <td width="10%"></td>
            <td width="45%">
              Ditetapkan di: Pasuruan, ${currentDateStr}<br>
              Dosen Pengampu Mata Kuliah,<br>
              <div style="margin: 4px 0;">
                <img src="${DOSEN_SIGNATURE_BASE64}" width="125" height="80" alt="Tanda Tangan Dosen" style="display:block;" />
              </div>
              <strong><u>${dosenFullName}</u></strong><br>
              NIP: 198806282015032001
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSemester = semester.replace(/[^a-zA-Z0-9]/g, '_');
  const safeCourse = courseTitle.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `Rekap_Presensi_16_Pertemuan_${safeCourse}_${safeSemester}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Attendance Recap (16 Meetings) to Microsoft Excel (.xls)
 */
export function exportAttendanceToExcel(options: ExportAttendanceOptions) {
  const {
    campusName = 'STAI JARINABI',
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    academicYear = 'T.A 2026/2027',
    students = [],
    attendance = {},
    grades = {},
  } = options;

  const meetingStats = Array.from({ length: 16 }, (_, i) => {
    const mNum = i + 1;
    let hCount = 0;
    students.forEach((s) => {
      if (attendance[mNum]?.[s.id] === 'H') hCount++;
    });
    const pct = students.length > 0 ? Math.round((hCount / students.length) * 100) : 0;
    return { mNum, hCount, pct };
  });

  const studentRows = students.map((std, idx) => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;

    const cellsHtml = Array.from({ length: 16 }, (_, i) => {
      const mNum = i + 1;
      const status = attendance[mNum]?.[std.id] || '-';
      if (status === 'H') hadir++;
      else if (status === 'I') izin++;
      else if (status === 'S') sakit++;
      else if (status === 'A') alfa++;

      let cellStyle = 'border:1px solid #cbd5e1; text-align:center;';
      if (status === 'H') cellStyle += ' background-color:#d1fae5; color:#065f46; font-weight:bold;';
      else if (status === 'I') cellStyle += ' background-color:#dbeafe; color:#1e40af; font-weight:bold;';
      else if (status === 'S') cellStyle += ' background-color:#fef3c7; color:#92400e; font-weight:bold;';
      else if (status === 'A') cellStyle += ' background-color:#fee2e2; color:#991b1b; font-weight:bold;';
      else cellStyle += ' color:#94a3b8;';

      return `<td style="${cellStyle}">${status === 'BELUM' ? '-' : status}</td>`;
    }).join('');

    const totalFilled = hadir + izin + sakit + alfa;
    const weightedPresence = hadir + 0.8 * izin + 0.8 * sakit;
    const pctAttendance = Math.round((hadir / 16) * 100);
    const scoreVal = grades[std.id]?.attendanceScore ?? (totalFilled > 0 ? Math.min(100, Math.round((weightedPresence / Math.max(1, totalFilled)) * 100)) : 100);
    const isLulus = pctAttendance >= 75 || scoreVal >= 75;

    return `
      <tr>
        <td style="border:1px solid #cbd5e1; text-align:center; mso-number-format:'0';">${idx + 1}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; mso-number-format:'\\@';">${std.nim}</td>
        <td style="border:1px solid #cbd5e1; font-weight:bold;">${std.name}</td>
        ${cellsHtml}
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#ecfdf5; color:#065f46; mso-number-format:'0';">${hadir}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#eff6ff; color:#1e40af; mso-number-format:'0';">${izin}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#fffbeb; color:#92400e; mso-number-format:'0';">${sakit}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#fef2f2; color:#991b1b; mso-number-format:'0';">${alfa}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; mso-number-format:'0%';">${pctAttendance / 100}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#ecfdf5; color:#064e3b; mso-number-format:'0';">${scoreVal}</td>
        <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:${isLulus ? '#047857' : '#b91c1c'};">
          ${isLulus ? 'MEMENUHI' : 'KURANG'}
        </td>
      </tr>
    `;
  }).join('');

  const footerHadirCells = meetingStats.map(m => `
    <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#e2e8f0; color:#0f172a; mso-number-format:'0';">${m.hCount}</td>
  `).join('');

  const footerPctCells = meetingStats.map(m => `
    <td style="border:1px solid #cbd5e1; text-align:center; font-weight:bold; background-color:#f1f5f9; color:#064e3b; mso-number-format:'0%';">${m.pct / 100}</td>
  `).join('');

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Rekap Presensi 16 Pertemuan</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
                <x:Print>
                  <x:Orientation>Landscape</x:Orientation>
                </x:Print>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #064e3b; color: #ffffff; font-weight: bold; border: 1px solid #0f172a; padding: 6px; text-align: center; }
        td { padding: 5px; }
      </style>
    </head>
    <body>
      <table>
        <tr>
          <th colspan="26" style="font-size:14pt; background-color:#064e3b; color:#ffffff; height:35px; text-align:center;">
            ${campusName || 'STAI JARINABI'} — REKAPITULASI PRESENSI KEHADIRAN MAHASISWA (16 PERTEMUAN)
          </th>
        </tr>
        <tr>
          <td colspan="26" style="text-align:center; font-size:10pt; color:#475569;">
            Program Studi: ${studyProgram} | Semester: ${semester} | Tahun Akademik: ${academicYear}
          </td>
        </tr>
        <tr>
          <td colspan="13"><strong>Mata Kuliah:</strong> ${courseTitle} (${courseCode}) - ${sks} SKS</td>
          <td colspan="13" style="text-align:right;"><strong>Dosen Pengampu:</strong> ${dosenFullName}</td>
        </tr>
        <tr>
          <td colspan="26" style="font-size:8.5pt; color:#64748b;">
            Bobot Presensi: 15% | Minimal Kehadiran Mengikuti UAS: 75%
          </td>
        </tr>
        <tr></tr>

        <thead>
          <tr>
            <th rowspan="2" style="width:35px;">No</th>
            <th rowspan="2" style="width:90px;">NIM</th>
            <th rowspan="2" style="width:220px;">Nama Mahasiswa</th>
            <th colspan="16">Pertemuan Perkuliahan (P1 s/d P16)</th>
            <th colspan="4">Rekapitulasi</th>
            <th rowspan="2" style="width:65px;">% Hdr</th>
            <th rowspan="2" style="width:75px;">Nilai (15%)</th>
            <th rowspan="2" style="width:90px;">Status</th>
          </tr>
          <tr>
            <th style="width:30px;">P1</th><th style="width:30px;">P2</th><th style="width:30px;">P3</th><th style="width:30px;">P4</th>
            <th style="width:30px;">P5</th><th style="width:30px;">P6</th><th style="width:30px;">P7</th><th style="width:38px; background-color:#047857;">P8 (UTS)</th>
            <th style="width:30px;">P9</th><th style="width:30px;">P10</th><th style="width:30px;">P11</th><th style="width:30px;">P12</th>
            <th style="width:30px;">P13</th><th style="width:30px;">P14</th><th style="width:30px;">P15</th><th style="width:38px; background-color:#047857;">P16 (UAS)</th>
            <th style="width:32px; background-color:#065f46;">H</th>
            <th style="width:32px; background-color:#1e40af;">I</th>
            <th style="width:32px; background-color:#92400e;">S</th>
            <th style="width:32px; background-color:#991b1b;">A</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
        <tfoot>
          <tr style="font-weight:bold; background-color:#e2e8f0;">
            <td colspan="3" style="border:1px solid #cbd5e1; text-align:right;">TOTAL MAHASISWA HADIR:</td>
            ${footerHadirCells}
            <td colspan="7" style="border:1px solid #cbd5e1; text-align:center; font-size:8pt; color:#475569;">Rekap 16 Pertemuan</td>
          </tr>
          <tr style="font-weight:bold; background-color:#f1f5f9;">
            <td colspan="3" style="border:1px solid #cbd5e1; text-align:right;">% KEHADIRAN KELAS:</td>
            ${footerPctCells}
            <td colspan="7" style="border:1px solid #cbd5e1; text-align:center; font-size:8pt; color:#064e3b;">Minimal Syarat UAS: ≥ 75%</td>
          </tr>
        </tfoot>
      </table>

      <br><br>
      <table>
        <tr>
          <td colspan="10" style="font-weight:bold;">Keterangan Status Presensi:</td>
        </tr>
        <tr>
          <td colspan="10">H = Hadir (100%), I = Izin (80%), S = Sakit (80%), A = Alfa (0%)</td>
        </tr>
        <tr>
          <td colspan="10" style="font-size:9pt; color:#555;">Ditetapkan di Pasuruan pada ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} oleh Dosen Pengampu: ${dosenFullName}</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSemester = semester.replace(/[^a-zA-Z0-9]/g, '_');
  const safeCourse = courseTitle.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `Rekap_Presensi_16_Pertemuan_${safeCourse}_${safeSemester}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Core helper to trigger official PDF print / Save as PDF dialog cleanly with resilient fallback
 */
export function printViaHiddenIframe(html: string, title?: string): void {
  const docTitle = title || 'Dokumen_Cetak_SIAKAD';

  // Hidden iframe printing (bypasses popup blockers and triggers browser print dialog immediately)
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to direct window.print or download:', e);
          try {
            window.print();
          } catch {
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${docTitle}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 4000);
        }
      }, 350);
      return;
    }
  } catch (err) {
    console.warn('Iframe setup failed, falling back to window print or download:', err);
  }

  // Strategy 3: Direct download fallback if printing is impossible
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docTitle}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.print();
  }
}

/**
 * Trigger official PDF print / Save as PDF dialog cleanly for Attendance (16 Meetings)
 */
export function exportAttendanceToPdf(options: ExportAttendanceOptions) {
  const html = generateAttendancePrintHtml(options);
  const safeCourse = (options.courseTitle || 'Kuliah').replace(/[^a-zA-Z0-9]/g, '_');
  printViaHiddenIframe(html, `Rekap_Presensi_16_Pertemuan_${safeCourse}`);
}

/**
 * Direct .PDF file download using jsPDF and html2canvas (No printer dialog required)
 */
export async function downloadAttendanceAsPdfFile(options: ExportAttendanceOptions): Promise<boolean> {
  const html = generateAttendancePrintHtml(options);
  const safeCourse = (options.courseTitle || 'Mata_Kuliah').replace(/[^a-zA-Z0-9]/g, '_');
  const safeSemester = (options.semester || 'Semester').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Rekap_Presensi_16_Pertemuan_${safeCourse}_${safeSemester}.pdf`;

  // Create an offscreen rendering container
  const container = document.createElement('div');
  container.id = 'pdf-render-canvas-container';
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.backgroundColor = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.warn('Canvas/jsPDF conversion failed, falling back to direct html document download:', err);
    downloadAttendanceAsHtmlFile(options);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Direct standalone printable HTML file download (Can be opened in any browser and printed offline)
 */
export function downloadAttendanceAsHtmlFile(options: ExportAttendanceOptions) {
  const html = generateAttendancePrintHtml(options);
  const safeCourse = (options.courseTitle || 'Mata_Kuliah').replace(/[^a-zA-Z0-9]/g, '_');
  const safeSemester = (options.semester || 'Semester').replace(/[^a-zA-Z0-9]/g, '_');
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekap_Presensi_16_Pertemuan_${safeCourse}_${safeSemester}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExportSingleMeetingOptions {
  campusName?: string;
  dosenFullName: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  academicYear?: string;
  meeting: MeetingSchedule;
  students: Student[];
  attendance: Record<number, Record<string, AttendanceStatus>>;
}

/**
 * Generate official Berita Acara & Attendance Sheet HTML for an individual meeting (Pertemuan Tertentu)
 */
export function generateSingleMeetingAttendancePrintHtml(options: ExportSingleMeetingOptions): string {
  const {
    campusName = 'STAI JARINABI',
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    academicYear = 'T.A 2026/2027',
    meeting,
    students = [],
    attendance = {},
  } = options;

  const meetingNumber = meeting.meetingNumber;
  const meetingAttendance = attendance[meetingNumber] || {};

  let hadir = 0;
  let izin = 0;
  let sakit = 0;
  let alfa = 0;

  students.forEach(std => {
    const st = meetingAttendance[std.id] || 'BELUM';
    if (st === 'H') hadir++;
    else if (st === 'I') izin++;
    else if (st === 'S') sakit++;
    else if (st === 'A') alfa++;
  });

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rowsHtml = students.map((std, idx) => {
    const status = meetingAttendance[std.id] || 'BELUM';
    let statusLabel = 'Belum Absen';
    let badgeColor = '#64748b';
    let bgRow = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    if (status === 'H') {
      statusLabel = 'HADIR (H)';
      badgeColor = '#065f46';
    } else if (status === 'I') {
      statusLabel = 'IZIN (I)';
      badgeColor = '#1e40af';
    } else if (status === 'S') {
      statusLabel = 'SAKIT (S)';
      badgeColor = '#92400e';
    } else if (status === 'A') {
      statusLabel = 'ALFA (A)';
      badgeColor = '#991b1b';
    }

    return `
      <tr style="background-color:${bgRow};">
        <td style="text-align:center; padding:6px; border:1px solid #cbd5e1;">${idx + 1}</td>
        <td style="text-align:center; padding:6px; border:1px solid #cbd5e1; font-family:monospace; font-weight:bold;">${std.nim}</td>
        <td style="padding:6px 10px; border:1px solid #cbd5e1; font-weight:bold;">${std.name}</td>
        <td style="padding:6px 10px; border:1px solid #cbd5e1; font-size:8pt; color:#475569;">${std.rpsPart || '-'}</td>
        <td style="text-align:center; padding:6px; border:1px solid #cbd5e1; font-weight:bold; color:${badgeColor};">
          ${statusLabel}
        </td>
        <td style="text-align:center; padding:6px; border:1px solid #cbd5e1; font-size:8pt; color:#64748b;">
          ${status === 'H' ? '✓ Hadir' : status === 'I' ? 'Surat Izin' : status === 'S' ? 'Surat Dokter' : status === 'A' ? 'Tanpa Keterangan' : '-'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Berita_Acara_Presensi_Pertemuan_${meetingNumber}_${courseCode}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #0f172a;
          margin: 0;
          padding: 15px;
          background-color: #ffffff;
        }
        .header-kop {
          text-align: center;
          border-bottom: 2.5px double #0f172a;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }
        .campus-name {
          font-size: 16pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #064e3b;
          margin: 0;
        }
        .kop-subtitle {
          font-size: 10pt;
          font-weight: 600;
          color: #334155;
          margin: 3px 0;
        }
        .doc-title {
          font-size: 13pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 14px 0 4px 0;
        }
        .doc-subtitle {
          text-align: center;
          font-size: 9.5pt;
          color: #475569;
          margin-bottom: 14px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 9.5pt;
        }
        .meta-table td {
          padding: 3px 6px;
          vertical-align: top;
        }
        .student-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin-bottom: 14px;
        }
        .student-table th {
          background-color: #064e3b;
          color: #ffffff;
          padding: 7px 6px;
          border: 1px solid #0f172a;
          text-align: center;
        }
        .summary-box {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 9pt;
          margin-bottom: 14px;
        }
        .signatures {
          width: 100%;
          margin-top: 25px;
          page-break-inside: avoid;
        }
        .signatures td {
          vertical-align: top;
          font-size: 9.5pt;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="position:sticky; top:0; left:0; right:0; background:linear-gradient(135deg, #064e3b, #0f766e); color:#ffffff; padding:10px 16px; margin:-15px -15px 15px -15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 3px 10px rgba(0,0,0,0.18); z-index:9999; font-family:sans-serif; border-bottom:2px solid #059669;">
        <div style="font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#34d399;"></span>
          <span>Berita Acara & Presensi Sesi Pertemuan Ke-${meetingNumber}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button onclick="window.print()" style="background:#10b981; color:#ffffff; border:none; padding:7px 18px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
            🖨️ Cetak / Simpan PDF Sesi Ini
          </button>
          <button onclick="window.close()" style="background:rgba(255,255,255,0.18); color:#ffffff; border:none; padding:7px 14px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer;">
            Tutup
          </button>
        </div>
      </div>

      <div class="header-kop">
        <div class="campus-name">${campusName}</div>
        <div class="kop-subtitle">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
        <div style="font-size:8.5pt; color:#64748b;">Berita Acara Pelaksanaan Perkuliahan & Daftar Hadir Mahasiswa</div>
      </div>

      <div class="doc-title">BERITA ACARA & DAFTAR PRESENSI PERTEMUAN KE-${meetingNumber}</div>
      <div class="doc-subtitle">Semester ${semester} • ${academicYear}</div>

      <table class="meta-table">
        <tr>
          <td width="20%"><strong>Mata Kuliah</strong></td>
          <td width="2%">:</td>
          <td width="40%">${courseTitle} (${courseCode})</td>
          <td width="18%"><strong>Pertemuan Ke</strong></td>
          <td width="2%">:</td>
          <td width="18%"><strong>${meetingNumber} dari 16 Sesi</strong></td>
        </tr>
        <tr>
          <td><strong>Dosen Pengampu</strong></td>
          <td>:</td>
          <td>${dosenFullName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}</td>
          <td><strong>Hari / Tanggal</strong></td>
          <td>:</td>
          <td><strong>${meeting.dateStr}</strong></td>
        </tr>
        <tr>
          <td><strong>Topik Kajian</strong></td>
          <td>:</td>
          <td colspan="4"><strong>${meeting.title}</strong></td>
        </tr>
        <tr>
          <td><strong>Pemateri / Presenter</strong></td>
          <td>:</td>
          <td colspan="4">${meeting.presenters.length > 0 ? meeting.presenters.join(', ') : 'Dosen Pengampu'}</td>
        </tr>
      </table>

      <table class="student-table">
        <thead>
          <tr>
            <th width="5%">No</th>
            <th width="15%">NIM</th>
            <th width="30%">Nama Mahasiswa</th>
            <th width="22%">Bagian RPS / Bab</th>
            <th width="15%">Status Hadir</th>
            <th width="13%">Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="summary-box">
        <div><strong>Total Mahasiswa:</strong> ${students.length} Orang</div>
        <div><strong>Hadir:</strong> <span style="color:#065f46; font-weight:bold;">${hadir}</span></div>
        <div><strong>Izin:</strong> <span style="color:#1e40af; font-weight:bold;">${izin}</span></div>
        <div><strong>Sakit:</strong> <span style="color:#92400e; font-weight:bold;">${sakit}</span></div>
        <div><strong>Alfa:</strong> <span style="color:#991b1b; font-weight:bold;">${alfa}</span></div>
        <div><strong>Persentase Sesi:</strong> <strong style="color:#065f46;">${students.length > 0 ? Math.round((hadir / students.length) * 100) : 0}%</strong></div>
      </div>

      <table class="signatures">
        <tr>
          <td width="45%" style="text-align:center;">
            Perwakilan Mahasiswa / Kosma,<br><br><br><br><br>
            <strong><u>( .................................................. )</u></strong><br>
            NIM: .......................................
          </td>
          <td width="10%"></td>
          <td width="45%" style="text-align:center;">
            Pasuruan, ${meeting.dateStr}<br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 4px auto; text-align:center;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="140" height="90" alt="Tanda Tangan Dosen" style="display:inline-block; margin: 2px 0;" />
            </div>
            <div style="display:inline-block; border:1px solid #059669; background-color:#ecfdf5; color:#065f46; font-size:7pt; font-weight:bold; padding:2px 8px; border-radius:4px; margin-bottom:4px;">
              ✓ TERVERIFIKASI SIAKAD DIGITAL
            </div><br>
            <strong><u>${dosenFullName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}</u></strong><br>
            NIP: 198806282015032001
          </td>
        </tr>
      </table>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch (e) {}
          }, 350);
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Print / Save PDF dialog for an individual meeting attendance sheet
 */
export function printSingleMeetingAttendance(options: ExportSingleMeetingOptions): void {
  const html = generateSingleMeetingAttendancePrintHtml(options);
  printViaHiddenIframe(html, `Presensi_Pertemuan_${options.meeting.meetingNumber}`);
}

/**
 * Direct .PDF file download for an individual meeting
 */
export async function downloadSingleMeetingAttendanceAsPdfFile(options: ExportSingleMeetingOptions): Promise<boolean> {
  const html = generateSingleMeetingAttendancePrintHtml(options);
  const filename = `Presensi_Pertemuan_${options.meeting.meetingNumber}_${(options.courseTitle || 'Kuliah').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '900px';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 900,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
    return true;
  } catch (err) {
    console.warn('Canvas conversion failed, falling back to download printable html:', err);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_Pertemuan_${options.meeting.meetingNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Export an individual meeting attendance sheet to Microsoft Word (.doc)
 */
export function exportSingleMeetingAttendanceToWord(options: ExportSingleMeetingOptions): void {
  const html = generateSingleMeetingAttendancePrintHtml(options);
  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Presensi_Pertemuan_${options.meeting.meetingNumber}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExportGradesOptions {
  campusName: string;
  dosenFullName: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  academicYear?: string;
  students: Student[];
  grades: Record<string, StudentGrade>;
  scope?: 'kolektif' | 'individu';
  selectedStudent?: Student;
}

/**
 * Generate official PDF printable HTML for Kolektif Grade Recap (A4 Landscape)
 */
export function generateGradesCollectivePrintHtml(options: ExportGradesOptions): string {
  const {
    campusName = 'STAI JARINABI',
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    academicYear = 'T.A 2026/2027',
    students = [],
    grades = {},
  } = options;

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const tableRows = students.map((std, idx) => {
    const g = grades[std.id] || {
      attendanceScore: 100,
      attitudeScore: 85,
      individualScore: 85,
      utsScore: 85,
      uasScore: 85,
      groupScore: 85,
      finalScore: 88,
      letterGrade: 'A-',
    };

    const feedback = getStudentPersonalizedFeedback(std.name, std.nim, g.finalScore, std.topic, idx);

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align:center; padding:5px 3px; border:1px solid #94a3b8; font-weight:bold;">${idx + 1}</td>
        <td style="text-align:center; padding:5px 3px; border:1px solid #94a3b8; font-family:monospace; font-size:8pt;">${std.nim}</td>
        <td style="padding:5px 6px; border:1px solid #94a3b8; font-weight:bold; color:#0f172a;">${std.name}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8;">${g.attendanceScore}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8;">${g.attitudeScore}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8;">${g.individualScore}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8;">${g.utsScore ?? 85}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8;">${g.uasScore ?? g.groupScore ?? 85}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8; font-weight:bold; background-color:#dcfce7; color:#166534;">${g.finalScore}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8; font-weight:bold; color:#0f172a;">${g.letterGrade}</td>
        <td style="text-align:center; padding:5px 2px; border:1px solid #94a3b8; font-weight:bold; font-size:7.5pt; color:${g.finalScore >= 60 ? '#15803d' : '#b91c1c'};">
          ${g.finalScore >= 60 ? 'LULUS' : 'TIDAK LULUS'}
        </td>
        <td style="padding:5px 6px; border:1px solid #94a3b8; font-size:7.5pt; line-height:1.2; color:#1e293b;">
          "${feedback.quote}" <br><strong style="color:#0369a1;">— ${feedback.scholar}</strong>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Nilai Kolektif - ${courseTitle}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 10mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 9pt;
          line-height: 1.3;
          color: #0f172a;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .kop-header {
          text-align: center;
          border-bottom: 2.5px solid #0f172a;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }
        .campus-name {
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #064e3b;
        }
        .sub-header {
          font-size: 9pt;
          font-weight: 600;
          color: #334155;
          margin-top: 1px;
        }
        .doc-title {
          font-size: 12pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 8px 0 6px 0;
        }
        .meta-grid {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
          margin-bottom: 8px;
        }
        .meta-grid td {
          padding: 2px 4px;
        }
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin-top: 4px;
        }
        .data-table th {
          background-color: #064e3b !important;
          color: #ffffff !important;
          border: 1px solid #334155;
          padding: 5px 2px;
          text-align: center;
          font-weight: bold;
          font-size: 8pt;
        }
        .sig-section {
          width: 100%;
          margin-top: 16px;
          page-break-inside: avoid;
        }
        .sig-section td {
          vertical-align: top;
          font-size: 9pt;
        }
      </style>
    </head>
    <body>
      <div class="kop-header">
        <div class="campus-name">${campusName}</div>
        <div class="sub-header">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
        <div class="sub-header">Daftar Peserta & Nilai Akhir (DPNA) Kolektif Perkuliahan • ${academicYear}</div>
      </div>

      <div class="doc-title">REKAPITULASI DAFTAR NILAI AKHIR KOLEKTIF MAHASISWA</div>

      <table class="meta-grid">
        <tr>
          <td width="15%"><strong>Mata Kuliah</strong></td>
          <td width="35%">: ${courseTitle} (${courseCode})</td>
          <td width="15%"><strong>Dosen Pengampu</strong></td>
          <td width="35%">: ${dosenFullName}</td>
        </tr>
        <tr>
          <td><strong>Bobot SKS</strong></td>
          <td>: ${sks} SKS</td>
          <td><strong>Semester / T.A</strong></td>
          <td>: ${semester}</td>
        </tr>
        <tr>
          <td><strong>Program Studi</strong></td>
          <td>: ${studyProgram}</td>
          <td><strong>Institusi Kampus</strong></td>
          <td>: ${campusName}</td>
        </tr>
      </table>

      <table class="data-table">
        <thead>
          <tr>
            <th width="3%">No</th>
            <th width="8%">NIM</th>
            <th width="16%">Nama Mahasiswa</th>
            <th width="6%">Presensi<br>(15%)</th>
            <th width="6%">Sikap<br>(10%)</th>
            <th width="6%">PPT/Mkl<br>(25%)</th>
            <th width="6%">UTS<br>(25%)</th>
            <th width="6%">UAS<br>(25%)</th>
            <th width="6%">Nilai<br>Akhir</th>
            <th width="5%">Grade</th>
            <th width="7%">Status</th>
            <th width="25%">Hikmah Kebijaksanaan & Tokoh</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div style="margin-top: 6px; font-size: 7.5pt; color: #475569;">
        * Skala Penilaian: A (≥85), A- (80-84), B+ (75-79), B (70-74), B- (65-69), C+ (60-64), C (55-59), D (&lt;55). Batas Kelulusan: Nilai Akhir ≥ 60.0.
      </div>

      <table class="sig-section">
        <tr>
          <td width="55%">
            Mengetahui,<br>
            Ketua Program Studi ${studyProgram}<br><br><br><br>
            <strong>( .................................................... )</strong><br>
            NIDN. ...............................................
          </td>
          <td width="45%">
            Ditetapkan di: Kampus ${campusName}<br>
            Pada Tanggal: ${currentDateStr}<br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 4px 0;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="130" height="75" alt="Tanda Tangan Dosen Pengampu" style="display: block;" />
            </div>
            <strong>${dosenFullName}</strong><br>
            Dosen Pengampu ${campusName}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generate official PDF printable HTML for Individual Student Transcript / KHS (A4 Portrait)
 */
export function generateGradeIndividualPrintHtml(options: ExportGradesOptions): string {
  const {
    campusName = 'STAI JARINABI',
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester,
    studyProgram,
    academicYear = 'T.A 2026/2027',
    selectedStudent,
    grades = {},
  } = options;

  if (!selectedStudent) return '';

  const g = grades[selectedStudent.id] || {
    attendanceScore: 100,
    attitudeScore: 85,
    individualScore: 85,
    utsScore: 85,
    uasScore: 85,
    groupScore: 85,
    finalScore: 88,
    letterGrade: 'A-',
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const feedback = getStudentPersonalizedFeedback(
    selectedStudent.name,
    selectedStudent.nim,
    g.finalScore,
    selectedStudent.topic,
    1
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Transkrip Nilai Individu - ${selectedStudent.name}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #0f172a;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .kop-header {
          text-align: center;
          border-bottom: 3px double #0f172a;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .campus-name {
          font-size: 18pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #064e3b;
        }
        .sub-header {
          font-size: 10.5pt;
          font-weight: 600;
          color: #334155;
          margin-top: 2px;
        }
        .doc-title {
          font-size: 13pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 14px 0 12px 0;
        }
        .student-bio {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          margin-bottom: 14px;
        }
        .student-bio td {
          padding: 4px 6px;
        }
        .grades-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          margin-top: 10px;
        }
        .grades-table th {
          background-color: #064e3b !important;
          color: #ffffff !important;
          border: 1px solid #334155;
          padding: 8px 6px;
          text-align: center;
          font-weight: bold;
        }
        .grades-table td {
          border: 1px solid #cbd5e1;
          padding: 7px 8px;
        }
        .wisdom-box {
          margin-top: 16px;
          padding: 12px 14px;
          background-color: #f8fafc;
          border-left: 4px solid #064e3b;
          border-radius: 4px;
          font-size: 9.5pt;
        }
        .sig-section {
          width: 100%;
          margin-top: 25px;
          page-break-inside: avoid;
        }
        .sig-section td {
          vertical-align: top;
          font-size: 10pt;
        }
      </style>
    </head>
    <body>
      <div class="kop-header">
        <div class="campus-name">${campusName}</div>
        <div class="sub-header">SISTEM INFORMASI AKADEMIK (SIAKAD) — PROGRAM STUDI ${studyProgram.toUpperCase()}</div>
        <div class="sub-header">KARTU HASIL EVALUASI STUDI & TRANSKRIP NILAI MAHASISWA</div>
      </div>

      <div class="doc-title">TRANSKRIP NILAI AKADEMIK MAHASISWA (KHS)</div>

      <table class="student-bio">
        <tr>
          <td width="20%"><strong>Nama Mahasiswa</strong></td>
          <td width="30%">: <strong>${selectedStudent.name}</strong></td>
          <td width="20%"><strong>Mata Kuliah</strong></td>
          <td width="30%">: ${courseTitle} (${courseCode})</td>
        </tr>
        <tr>
          <td><strong>Nomor Induk (NIM)</strong></td>
          <td>: ${selectedStudent.nim}</td>
          <td><strong>Bobot / SKS</strong></td>
          <td>: ${sks} SKS</td>
        </tr>
        <tr>
          <td><strong>Program Studi</strong></td>
          <td>: ${studyProgram}</td>
          <td><strong>Semester / T.A</strong></td>
          <td>: ${semester} (${academicYear})</td>
        </tr>
        <tr>
          <td><strong>Dosen Pengampu</strong></td>
          <td>: ${dosenFullName}</td>
          <td><strong>Topik Pembahasan</strong></td>
          <td>: ${selectedStudent.topic || '-'}</td>
        </tr>
      </table>

      <table class="grades-table">
        <thead>
          <tr>
            <th width="6%">No</th>
            <th width="44%">Komponen Penilaian Akademik</th>
            <th width="15%">Bobot</th>
            <th width="15%">Nilai Angka</th>
            <th width="20%">Skor Terbobot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align:center;">1</td>
            <td>Presensi Kehadiran Kuliah (Minimal 75%)</td>
            <td style="text-align:center;">15%</td>
            <td style="text-align:center; font-weight:bold;">${g.attendanceScore}</td>
            <td style="text-align:center;">${(g.attendanceScore * 0.15).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">2</td>
            <td>Sikap, Akhlak & Keaktifan di Kelas</td>
            <td style="text-align:center;">10%</td>
            <td style="text-align:center; font-weight:bold;">${g.attitudeScore}</td>
            <td style="text-align:center;">${(g.attitudeScore * 0.10).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">3</td>
            <td>Tugas Individu, Makalah & Presentasi PPT</td>
            <td style="text-align:center;">25%</td>
            <td style="text-align:center; font-weight:bold;">${g.individualScore}</td>
            <td style="text-align:center;">${(g.individualScore * 0.25).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">4</td>
            <td>Ujian Tengah Semester (UTS)</td>
            <td style="text-align:center;">25%</td>
            <td style="text-align:center; font-weight:bold;">${g.utsScore ?? 85}</td>
            <td style="text-align:center;">${((g.utsScore ?? 85) * 0.25).toFixed(1)}</td>
          </tr>
          <tr>
            <td style="text-align:center;">5</td>
            <td>Ujian Akhir Semester / Proyek UAS</td>
            <td style="text-align:center;">25%</td>
            <td style="text-align:center; font-weight:bold;">${g.uasScore ?? g.groupScore ?? 85}</td>
            <td style="text-align:center;">${((g.uasScore ?? g.groupScore ?? 85) * 0.25).toFixed(1)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background-color:#f1f5f9; font-weight:bold;">
            <td colspan="3" style="text-align:right; font-size:11pt;">NILAI AKHIR KUMULATIF:</td>
            <td colspan="2" style="text-align:center; font-size:13pt; color:#166534; background-color:#dcfce7;">
              ${g.finalScore} / 100
            </td>
          </tr>
          <tr style="background-color:#ffffff; font-weight:bold;">
            <td colspan="3" style="text-align:right;">HURUF MUTU (GRADE) & STATUS KELULUSAN:</td>
            <td colspan="2" style="text-align:center; font-size:11pt; color:${g.finalScore >= 60 ? '#15803d' : '#b91c1c'};">
              Grade ${g.letterGrade} • ${g.finalScore >= 60 ? 'LULUS MEMUASKAN' : 'TIDAK LULUS'}
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="wisdom-box">
        <strong>Pesan & Nasihat Akademik Dosen:</strong><br>
        <em>"${feedback.quote}"</em><br>
        <span style="color:#0369a1; font-weight:bold;">— Nasihat Tokoh: ${feedback.scholar}</span>
      </div>

      <table class="sig-section">
        <tr>
          <td width="55%">
            Mengetahui,<br>
            Ketua Program Studi ${studyProgram}<br><br><br><br>
            <strong>( .................................................... )</strong><br>
            NIDN. ...............................................
          </td>
          <td width="45%">
            Ditetapkan di: Kampus ${campusName}<br>
            Pada Tanggal: ${currentDateStr}<br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 6px 0;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="140" height="85" alt="Tanda Tangan Dosen Pengampu" style="display: block;" />
            </div>
            <strong>${dosenFullName}</strong><br>
            Dosen Pengampu ${campusName}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Trigger official PDF print / Save as PDF dialog for grades (Kolektif or Individu)
 */
export function exportGradesToPdf(options: ExportGradesOptions): void {
  if (options.scope === 'individu' && options.selectedStudent) {
    const html = generateGradeIndividualPrintHtml(options);
    printViaHiddenIframe(html, `Transkrip_Nilai_${options.selectedStudent.name}`);
  } else {
    const html = generateGradesCollectivePrintHtml(options);
    printViaHiddenIframe(html, `Rekapitulasi_Nilai_${options.courseTitle}`);
  }
}

/**
 * Trigger official PDF print / Save as PDF dialog for RPS (Rencana Pembelajaran Semester)
 */
export function exportRpsToPdf(
  profile: DosenProfile,
  meetings: MeetingSchedule[],
  _rpsRawText?: string
): void {
  const campus = profile.campusName || 'STAI Jarinabi';
  const dosen = profile.name || (profile.dosenName ? `${profile.dosenName}${profile.dosenTitle ? ', ' + profile.dosenTitle : ''}` : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');

  const meetingRows = meetings.map(m => `
    <tr>
      <td style="text-align:center; padding:5px; border:1px solid #94a3b8; font-weight:bold;">${m.meetingNumber}</td>
      <td style="padding:5px; border:1px solid #94a3b8;">${m.dateStr}</td>
      <td style="padding:5px; border:1px solid #94a3b8; font-weight:bold; color:#0f172a;">${m.title}</td>
      <td style="padding:5px; border:1px solid #94a3b8; font-size:8pt; color:#334155;">${m.description}</td>
      <td style="padding:5px; border:1px solid #94a3b8; text-align:center; font-weight:bold; color:#065f46;">
        ${m.presentationFormat === 'kelompok' ? 'Kelompok' : 'Individu'}
      </td>
      <td style="padding:5px; border:1px solid #94a3b8; font-size:8pt;">
        ${m.presenters && m.presenters.length > 0 ? m.presenters.join(', ') : '-'}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>RPS ${profile.courseTitle}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 9pt;
          line-height: 1.35;
          color: #0f172a;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }
        .title {
          font-size: 13pt;
          font-weight: bold;
          text-align: center;
          text-transform: uppercase;
          margin: 8px 0;
        }
        table.meta {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          font-size: 8.5pt;
        }
        table.meta td {
          padding: 3px 4px;
        }
        table.grid {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          margin-top: 6px;
        }
        table.grid th {
          border: 1px solid #334155;
          background: #064e3b !important;
          color: #ffffff !important;
          padding: 6px 3px;
          text-align: center;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin:0; text-transform:uppercase; color:#064e3b; font-size:15pt;">${campus}</h2>
        <div style="font-size:10pt; font-weight:600;">PROGRAM STUDI ${profile.studyProgram.toUpperCase()}</div>
        <div style="font-size:9pt; color:#475569;">KAMPUS ${campus.toUpperCase()} • TAHUN AKADEMIK 2026/2027</div>
      </div>

      <div class="title">RENCANA PEMBELAJARAN SEMESTER (RPS) 16 PERTEMUAN</div>

      <table class="meta">
        <tr>
          <td width="20%"><strong>Mata Kuliah</strong></td>
          <td width="30%">: ${profile.courseTitle} (${profile.courseCode})</td>
          <td width="20%"><strong>Dosen Pengampu</strong></td>
          <td width="30%">: ${dosen}</td>
        </tr>
        <tr>
          <td><strong>Bobot SKS</strong></td>
          <td>: ${profile.sks} SKS</td>
          <td><strong>Semester / T.A</strong></td>
          <td>: ${profile.semester}</td>
        </tr>
      </table>

      <table class="grid">
        <thead>
          <tr>
            <th width="5%">Prt</th>
            <th width="12%">Tanggal</th>
            <th width="28%">Materi Pokok & Topik Perkuliahan</th>
            <th width="28%">Uraian Pembahasan & RPS</th>
            <th width="10%">Format</th>
            <th width="17%">Pemateri / Kelompok</th>
          </tr>
        </thead>
        <tbody>
          ${meetingRows}
        </tbody>
      </table>

      <table style="width:100%; margin-top:20px; page-break-inside:avoid;">
        <tr>
          <td width="55%" style="font-size:9pt; vertical-align:top;">
            Menyetujui,<br>
            Ketua Program Studi ${profile.studyProgram}<br><br><br><br>
            <strong>( .................................................... )</strong><br>
            NIDN. ...............................................
          </td>
          <td width="45%" style="font-size:9pt; vertical-align:top;">
            Ditetapkan di: ${campus}<br>
            Dosen Pengampu Mata Kuliah,<br>
            <div style="margin: 4px 0;">
              <img src="${DOSEN_SIGNATURE_BASE64}" width="120" height="70" alt="Tanda Tangan Dosen" style="display: block;" />
            </div>
            <strong>${dosen}</strong><br>
            Dosen Pengampu ${campus}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  printViaHiddenIframe(html, `RPS_${profile.courseTitle}`);
}

/**
 * Export complete task data (Presentations, UTS, UAS, Quiz, SIAKAD Grades) to multi-sheet Excel (.xlsx)
 */
export function exportAllTasksToExcel(db: SiakadDatabase) {
  const wb = XLSX.utils.book_new();
  const profile = db.courseProfile;

  // Sheet 1: Tugas Presentasi RPS (Part 1 - 15)
  const presentationData = (db.students || []).map((std, idx) => {
    const sub = (db.submissions || []).find(s => s.studentId === std.id);
    return {
      'No': idx + 1,
      'NIM': std.nim,
      'Nama Mahasiswa': std.name,
      'Pertemuan / RPS': sub?.rpsPart || std.rpsPart || `Pertemuan ${std.meetingNumber || 2}`,
      'Topik / Judul Materi': sub?.topic || std.topic,
      'Format': sub?.presentationType === 'kelompok' ? 'Kelompok' : 'Individu',
      'Rekan Teman': sub?.partnerName || '-',
      'Pilihan Tugas': sub?.submissionChoice === 'ppt_only' ? 'Hanya PPT' : sub?.submissionChoice === 'makalah_only' ? 'Hanya Makalah' : 'PPT & Makalah',
      'Link / File PPT': sub?.pptType === 'link' ? (sub.pptUrl || '-') : (sub?.pptFileName || (sub?.pptFileData ? 'File Terunggah' : '-')),
      'Link / File Makalah': sub?.makalahType === 'link' ? (sub.makalahUrl || '-') : (sub?.makalahFileName || (sub?.makalahFileData ? 'File Terunggah' : '-')),
      'Waktu Pengumpulan': sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : 'Belum Mengumpulkan',
      'Nilai Tugas': sub?.grade !== undefined ? sub.grade : (db.grades?.[std.id]?.individualScore ?? '-'),
      'Feedback Dosen': sub?.feedback || db.grades?.[std.id]?.notes || '-',
      'Status': sub?.grade !== undefined ? 'Sudah Dinilai Dosen' : sub ? 'Terkumpul (Menunggu Penilaian)' : 'Belum Dikirim',
    };
  });
  const wsPresentation = XLSX.utils.json_to_sheet(presentationData);
  XLSX.utils.book_append_sheet(wb, wsPresentation, 'Tugas Presentasi');

  // Sheet 2: Tugas UTS (5 Soal Esai & Deteksi AI)
  const utsData = (db.students || []).map((std, idx) => {
    const uts = (db.utsSubmissions || []).find(u => u.studentId === std.id);
    return {
      'No': idx + 1,
      'NIM': std.nim,
      'Nama Mahasiswa': std.name,
      'Status UTS': uts ? 'Sudah Mengirim' : 'Belum Mengirim',
      'Waktu Kirim': uts?.submittedAt ? new Date(uts.submittedAt).toLocaleString('id-ID') : '-',
      'Skor Deteksi AI': uts?.aiDetectionScore !== undefined ? `${uts.aiDetectionScore}%` : '-',
      'Status AI': uts?.aiVerdict || '-',
      'Nilai UTS': uts?.grade !== undefined ? uts.grade : (db.grades?.[std.id]?.utsScore ?? '-'),
      'Feedback Dosen': uts?.feedback || '-',
      'Link / File Dokumen': uts?.docLink || uts?.fileName || '-',
    };
  });
  const wsUts = XLSX.utils.json_to_sheet(utsData);
  XLSX.utils.book_append_sheet(wb, wsUts, 'Tugas UTS');

  // Sheet 3: Proyek Video UAS (Kelompok 1-5)
  const uasGroupData = (db.groups || []).map((grp, idx) => {
    return {
      'No': idx + 1,
      'Kelompok': grp.name,
      'Judul Proyek Video': grp.title,
      'Status Submit': grp.submission?.videoUrl ? 'Sudah Mengirim' : 'Belum Mengirim',
      'Link Video': grp.submission?.videoUrl || '-',
      'Link Canva / Drive': grp.submission?.canvaUrl || grp.submission?.driveUrl || '-',
      'Tools AI Digunakan': grp.submission?.aiToolsUsed || grp.toolsSuggested || '-',
      'Diserahkan Oleh': grp.submission?.submittedBy || '-',
      'Waktu Submit': grp.submission?.submittedAt ? new Date(grp.submission.submittedAt).toLocaleString('id-ID') : '-',
      'Nilai UAS': grp.grade !== undefined ? grp.grade : '-',
      'Feedback Dosen': grp.feedback || '-',
      'Anggota Kelompok': Array.isArray(grp.members) ? grp.members.join(', ') : '-',
    };
  });
  const wsUas = XLSX.utils.json_to_sheet(uasGroupData);
  XLSX.utils.book_append_sheet(wb, wsUas, 'Proyek Video UAS');

  // Sheet 4: Kuis Interaktif Game
  const quizData = (db.quizSubmissions || []).map((q, idx) => {
    return {
      'No': idx + 1,
      'Nama Mahasiswa': q.studentName,
      'Skor Kuis (/100)': q.score,
      'Jawaban Benar': q.correctCount,
      'Total Soal': q.totalQuestions,
      'Waktu Pengerjaan (Detik)': q.timeTakenSeconds || 0,
      'Pengawasan Kamera Live': q.cameraVerified ? 'Terverifikasi Aktif' : 'Non-Aktif',
      'Waktu Pengerjaan': q.submittedAt ? new Date(q.submittedAt).toLocaleString('id-ID') : '-',
    };
  });
  const wsQuiz = XLSX.utils.json_to_sheet(quizData.length > 0 ? quizData : [{ 'Info': 'Belum ada data kuis tersimpan' }]);
  XLSX.utils.book_append_sheet(wb, wsQuiz, 'Kuis Interaktif');

  // Sheet 5: Rekapitulasi Nilai Lengkap SIAKAD
  const gradesData = (db.students || []).map((std, idx) => {
    const g = db.grades?.[std.id] || {
      attendanceScore: 100,
      attitudeScore: 85,
      individualScore: 85,
      utsScore: 85,
      uasScore: 85,
      groupScore: 85,
      finalScore: 88,
      letterGrade: 'A-',
    };
    return {
      'No': idx + 1,
      'NIM': std.nim,
      'Nama Mahasiswa': std.name,
      'Kehadiran (10%)': g.attendanceScore,
      'Sikap / Kuis (10%)': g.attitudeScore,
      'Tugas Presentasi (20%)': g.individualScore,
      'UTS (30%)': g.utsScore ?? 85,
      'UAS (30%)': g.uasScore ?? g.groupScore ?? 85,
      'Nilai Akhir (100%)': g.finalScore,
      'Huruf Mutu': g.letterGrade,
      'Status Kelulusan': g.finalScore >= 60 ? 'LULUS' : 'TIDAK LULUS',
      'Catatan Dosen': g.notes || '-',
    };
  });
  const wsGrades = XLSX.utils.json_to_sheet(gradesData);
  XLSX.utils.book_append_sheet(wb, wsGrades, 'Rekap Nilai SIAKAD');

  const fileName = `Rekap-Data-Tugas-SIAKAD-${(profile?.courseTitle || 'MPI').replace(/[^a-zA-Z0-9_-]/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export complete permanent backup as JSON file
 */
export function exportAllTasksToJson(db: SiakadDatabase) {
  const exportPayload = {
    app: 'SIAKAD MPI 1 - Pascasarjana STAI Jarinabi',
    courseTitle: db.courseProfile?.courseTitle || 'Filsafat Ilmu',
    dosenName: db.courseProfile?.dosenName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
    exportTimestamp: new Date().toISOString(),
    exportDateFormatted: new Date().toLocaleString('id-ID'),
    totalStudents: db.students?.length || 0,
    totalPresentationSubmissions: db.submissions?.length || 0,
    totalUtsSubmissions: db.utsSubmissions?.length || 0,
    totalUasSubmissions: db.uasSubmissions?.length || 0,
    totalQuizSubmissions: db.quizSubmissions?.length || 0,
    data: db,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `siakad-cadangan-tugas-lengkap-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate backup JSON before importing
 */
export function validateBackupJson(jsonString: string): { success: boolean; data?: SiakadDatabase; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const dbData: SiakadDatabase = parsed.data || parsed;

    if (!dbData.students || !Array.isArray(dbData.students)) {
      return { success: false, error: 'Format file tidak valid: Data mahasiswa tidak ditemukan.' };
    }

    return { success: true, data: dbData };
  } catch (err) {
    return { success: false, error: 'File tidak berupa format JSON yang valid.' };
  }
}

export interface ExportRekapNilaiDanTugasOptions {
  campusName: string;
  dosenFullName: string;
  dosenNip?: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  academicYear?: string;
  students: Student[];
  grades: Record<string, StudentGrade>;
  submissions?: IndividualSubmission[];
  utsSubmissions?: UtsSubmission[];
  uasSubmissions?: UtsSubmission[];
  groups?: GroupProject[];
  quizSubmissions?: QuizSubmission[];
}

/**
 * Generate print-ready HTML report formatting Grades (Nilai) and Assignments (Daftar Tugas)
 * with dedicated CSS (@media print, @page A4 landscape)
 */
export function generateRekapNilaiDanTugasHtml(options: ExportRekapNilaiDanTugasOptions): string {
  const {
    campusName = 'STAI Syarif Muhammad Jarinabi',
    dosenFullName = 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
    courseTitle = 'Filsafat Ilmu',
    courseCode = 'MPI-501',
    sks = 3,
    semester = 'Semester Ganjil 2026/2027',
    studyProgram = 'Manajemen Pendidikan Islam (MPI 1)',
    students = [],
    grades = {},
    submissions = [],
    utsSubmissions = [],
    uasSubmissions = [],
    groups = [],
    quizSubmissions = [],
  } = options;

  const totalStudents = students.length;
  let totalScoreSum = 0;
  let passCount = 0;

  const rowsHtml = students.map((std, idx) => {
    const g = grades[std.id] || {
      attendanceScore: 100,
      attitudeScore: 85,
      individualScore: 85,
      utsScore: 85,
      uasScore: 85,
      finalScore: 88,
      letterGrade: 'A-',
      notes: '',
    };

    totalScoreSum += g.finalScore;
    if (g.finalScore >= 65) passCount++;

    // Assignment Status 1: Tugas Presentasi (PPT & Makalah)
    const indivSub = (submissions || []).find(
      s => s.studentId === std.id || ((s as any).nim && (s as any).nim === std.nim) || (s.studentName && s.studentName.toLowerCase() === std.name.toLowerCase())
    );
    const hasPpt = Boolean(indivSub?.pptUrl || indivSub?.pptFileData);
    const hasMakalah = Boolean(indivSub?.makalahUrl || indivSub?.makalahFileData);
    let presStatusText = 'Belum Ada';
    let presBadgeColor = '#ef4444';
    if (hasPpt && hasMakalah) {
      presStatusText = 'Lengkap (PPT+Mkl)';
      presBadgeColor = '#059669';
    } else if (hasPpt) {
      presStatusText = 'PPT Saja';
      presBadgeColor = '#0284c7';
    } else if (hasMakalah) {
      presStatusText = 'Makalah Saja';
      presBadgeColor = '#7c3aed';
    }

    // Assignment Status 2: UTS Essay
    const utsSub = (utsSubmissions || []).find(
      u => u.studentId === std.id || (u.answers && Object.keys(u.answers).length > 0)
    );
    const utsStatusText = utsSub ? `Terkumpul (${g.utsScore ?? 85})` : 'Belum Kirim';
    const utsBadgeColor = utsSub ? '#059669' : '#dc2626';

    // Assignment Status 3: UAS Video Kelompok
    const studentGroup = (groups || []).find(grp => grp.members && grp.members.some(m => m.toLowerCase().includes(std.name.toLowerCase())));
    const uasGroupSub = studentGroup?.submission;
    const uasSubDirect = (uasSubmissions || []).find(u => u.studentId === std.id);
    const hasUas = Boolean(uasGroupSub?.videoUrl || uasSubDirect?.answers || uasSubDirect?.docLink);
    const uasStatusText = hasUas ? `Klp ${studentGroup?.id || 1} (${g.uasScore ?? 85})` : 'Belum Kirim';
    const uasBadgeColor = hasUas ? '#059669' : '#d97706';

    // Quiz score
    const quizSub = (quizSubmissions || []).find(q => q.studentId === std.id || (q.studentName && q.studentName.toLowerCase() === std.name.toLowerCase()));
    const quizScoreText = quizSub?.score !== undefined ? `${quizSub.score} Poin` : `${g.attitudeScore} Pts`;

    const statusKelulusan = g.finalScore >= 65 ? 'LULUS' : 'EVALUASI';
    const statusColor = g.finalScore >= 65 ? '#065f46' : '#991b1b';

    const feedback = getStudentPersonalizedFeedback(std.name, std.nim, g.finalScore, std.topic);

    return `
      <tr style="border-bottom: 1px solid #cbd5e1; font-size: 8pt; page-break-inside: avoid;">
        <td style="text-align: center; padding: 4px 2px; font-weight: bold; border-right: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 4px 4px; font-family: monospace; border-right: 1px solid #e2e8f0; font-size: 7.5pt;">${std.nim}</td>
        <td style="padding: 4px 4px; font-weight: 600; border-right: 1px solid #e2e8f0;">
          <div>${std.name}</div>
          <div style="font-size: 6.8pt; color: #64748b; font-weight: normal;">${std.rpsPart} • ${std.topic.slice(0, 35)}...</div>
        </td>
        <td style="padding: 4px 3px; text-align: center; border-right: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 2px 4px; border-radius: 4px; font-size: 7pt; font-weight: bold; background-color: ${presBadgeColor}15; color: ${presBadgeColor}; border: 1px solid ${presBadgeColor}40;">
            ${presStatusText}
          </span>
          <div style="font-size: 7pt; font-weight: bold; color: #334155; margin-top: 1px;">Nilai: ${g.individualScore}</div>
        </td>
        <td style="padding: 4px 3px; text-align: center; border-right: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 2px 4px; border-radius: 4px; font-size: 7pt; font-weight: bold; background-color: ${utsBadgeColor}15; color: ${utsBadgeColor}; border: 1px solid ${utsBadgeColor}40;">
            ${utsStatusText}
          </span>
        </td>
        <td style="padding: 4px 3px; text-align: center; border-right: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 2px 4px; border-radius: 4px; font-size: 7pt; font-weight: bold; background-color: ${uasBadgeColor}15; color: ${uasBadgeColor}; border: 1px solid ${uasBadgeColor}40;">
            ${uasStatusText}
          </span>
        </td>
        <td style="text-align: center; padding: 4px 3px; border-right: 1px solid #e2e8f0; font-size: 7.5pt;">${quizScoreText}</td>
        <td style="text-align: center; padding: 4px 3px; border-right: 1px solid #e2e8f0; font-size: 7.5pt;">${g.attendanceScore}%</td>
        <td style="text-align: center; padding: 4px 3px; border-right: 1px solid #e2e8f0; font-size: 7.5pt;">${g.attitudeScore}</td>
        <td style="text-align: center; padding: 4px 3px; font-weight: bold; border-right: 1px solid #e2e8f0; background-color: #f8fafc; font-size: 8.5pt;">${g.finalScore}</td>
        <td style="text-align: center; padding: 4px 3px; font-weight: 800; border-right: 1px solid #e2e8f0; background-color: #f1f5f9; font-size: 8.5pt;">${g.letterGrade}</td>
        <td style="text-align: center; padding: 4px 3px; font-weight: 700; border-right: 1px solid #e2e8f0; color: ${statusColor}; font-size: 7.5pt;">${statusKelulusan}</td>
        <td style="padding: 4px 5px; font-size: 7pt; color: #475569; font-style: italic;">
          "${feedback.quote.slice(0, 75)}..." (${feedback.scholar})
        </td>
      </tr>
    `;
  }).join('');

  const classAverage = totalStudents > 0 ? (totalScoreSum / totalStudents).toFixed(1) : '0';
  const passPercentage = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;
  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekap_Nilai_Dan_Tugas_${courseCode}_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 8mm 8mm 8mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 6mm 8mm;
      font-family: 'Times New Roman', Times, serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 8.5pt;
      line-height: 1.25;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
    }
    .print-btn-bar {
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #064e3b;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-btn {
      background: #f59e0b;
      color: #0f172a;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 9pt;
    }
    .header-container {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-campus {
      font-size: 13pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header-prodi {
      font-size: 10pt;
      font-weight: bold;
      color: #1e293b;
    }
    .header-address {
      font-size: 7.5pt;
      color: #475569;
      font-style: italic;
    }
    .report-title {
      font-size: 11pt;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 8px 0 3px 0;
      color: #064e3b;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4px 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-size: 7.8pt;
    }
    .meta-item {
      display: flex;
      justify-content: space-between;
    }
    .meta-label {
      color: #475569;
      font-weight: 600;
    }
    .meta-val {
      font-weight: bold;
      color: #0f172a;
    }
    .weight-legend {
      display: flex;
      gap: 12px;
      justify-content: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 3px 8px;
      margin-bottom: 8px;
      font-size: 7pt;
      font-weight: 600;
      color: #334155;
    }
    table.rekap-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
    }
    table.rekap-table th {
      background-color: #064e3b !important;
      color: #ffffff !important;
      font-weight: bold;
      text-align: center;
      padding: 4px 3px;
      font-size: 7.5pt;
      border: 1px solid #042f2e;
    }
    table.rekap-table td {
      border: 1px solid #cbd5e1;
    }
    .stat-box {
      margin-top: 8px;
      display: flex;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      font-size: 7.8pt;
      font-weight: bold;
    }
    .sign-section {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sign-col {
      width: 200px;
      text-align: center;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <!-- Print Bar for Standalone Browser Tab -->
  <div class="print-btn-bar no-print">
    <div>
      <strong>Laporan Siap Cetak / Simpan ke PDF:</strong> Rekap Nilai Akademik & Status Daftar Tugas Mahasiswa
    </div>
    <button type="button" class="print-btn" onclick="window.print()">
      🖨️ CETAK / SIMPAN SEBAGAI PDF
    </button>
  </div>

  <!-- Kop Surat Resmi -->
  <div class="header-container">
    <div class="header-campus">${campusName}</div>
    <div class="header-prodi">${studyProgram}</div>
    <div class="header-address">Sistem Informasi Akademik Terintegrasi (SIAKAD) • Kampus Unggul & Berkarakter</div>
  </div>

  <div class="report-title">
    REKAPITULASI NILAI AKADEMIK & STATUS PENGUMPULAN DAFTAR TUGAS
  </div>

  <div class="meta-grid">
    <div class="meta-item"><span class="meta-label">Mata Kuliah:</span> <span class="meta-val">${courseTitle} (${courseCode})</span></div>
    <div class="meta-item"><span class="meta-label">Semester / SKS:</span> <span class="meta-val">${semester} • ${sks} SKS</span></div>
    <div class="meta-item"><span class="meta-label">Dosen Pengampu:</span> <span class="meta-val">${dosenFullName}</span></div>
    <div class="meta-item"><span class="meta-label">Total Mahasiswa:</span> <span class="meta-val">${totalStudents} Orang</span></div>
    <div class="meta-item"><span class="meta-label">Tingkat Kelulusan:</span> <span class="meta-val">${passPercentage}% (${passCount}/${totalStudents})</span></div>
    <div class="meta-item"><span class="meta-label">Tanggal Cetak:</span> <span class="meta-val">${printDateStr}</span></div>
  </div>

  <div class="weight-legend">
    <span>Bobot Penilaian:</span>
    <span>Presensi 16 Sesi (15%)</span>
    <span>•</span>
    <span>Sikap/Keaktifan (10%)</span>
    <span>•</span>
    <span>Tugas PPT/Makalah (25%)</span>
    <span>•</span>
    <span>UTS 5 Esai (25%)</span>
    <span>•</span>
    <span>UAS Video Kelompok (25%)</span>
  </div>

  <table class="rekap-table">
    <thead>
      <tr>
        <th style="width: 24px;">No</th>
        <th style="width: 65px;">NIM</th>
        <th>Nama Mahasiswa & Materi RPS</th>
        <th style="width: 78px;">Tugas PPT & Mkl<br>(25%)</th>
        <th style="width: 72px;">UTS 5 Esai<br>(25%)</th>
        <th style="width: 72px;">UAS Video<br>(25%)</th>
        <th style="width: 50px;">Kuis Game</th>
        <th style="width: 44px;">Presensi<br>(15%)</th>
        <th style="width: 40px;">Sikap<br>(10%)</th>
        <th style="width: 44px;">Nilai<br>Akhir</th>
        <th style="width: 40px;">Huruf<br>Mutu</th>
        <th style="width: 55px;">Status</th>
        <th style="width: 140px;">Mutiara Filsafat / Catatan Khusus</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="stat-box">
    <span>Rangkuman Kelas:</span>
    <span>Total: ${totalStudents} Mhs</span>
    <span>•</span>
    <span style="color: #065f46;">Lulus: ${passCount} Mhs</span>
    <span>•</span>
    <span style="color: #991b1b;">Evaluasi/Remidi: ${totalStudents - passCount} Mhs</span>
    <span>•</span>
    <span>Rata-Rata Nilai: ${classAverage}</span>
    <span>•</span>
    <span>Standar Kelulusan: Nilai Akhir &ge; 65 (C+)</span>
  </div>

  <div class="sign-section">
    <div class="sign-col">
      <div>Mengetahui,</div>
      <div style="font-weight: bold; margin-bottom: 40px;">Ketua Program Studi MPI</div>
      <div style="font-weight: bold; text-decoration: underline;">Dr. H. Ahmad Muzammil, M.Pd.I</div>
      <div style="font-size: 7pt; color: #475569;">NIDN: 2108037801</div>
    </div>

    <div class="sign-col" style="font-size: 7.5pt; color: #475569; display: flex; flex-direction: column; justify-content: center;">
      <div style="border: 1px dashed #94a3b8; padding: 6px; border-radius: 4px; background: #f8fafc;">
        <div style="font-weight: bold; color: #064e3b;">VERIFIKASI SISTEM SIAKAD</div>
        <div>Dokumen resmi dicetak secara sah</div>
        <div>Integritas data dijamin aman</div>
      </div>
    </div>

    <div class="sign-col">
      <div>Pasuruan, ${printDateStr}</div>
      <div style="font-weight: bold; margin-bottom: 2px;">Dosen Pengampu Mata Kuliah,</div>
      <div style="height: 48px; display: flex; align-items: center; justify-content: center;">
        <img src="${DOSEN_SIGNATURE_BASE64}" alt="Tanda Tangan Dosen" style="max-height: 46px; max-width: 130px; object-fit: contain;" />
      </div>
      <div style="font-weight: bold; text-decoration: underline;">${dosenFullName}</div>
      <div style="font-size: 7pt; color: #475569;">NIDN / NIP: 2105099201</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
}

/**
 * Trigger official 'Unduh Rekap PDF' dialog with custom CSS formatting Nilai and Daftar Tugas
 */
export function exportRekapNilaiDanTugasPdf(options: ExportRekapNilaiDanTugasOptions): void {
  const html = generateRekapNilaiDanTugasHtml(options);
  const docTitle = `Rekap_Nilai_Dan_Tugas_${options.courseCode || 'MPI'}_${new Date().toISOString().slice(0, 10)}`;
  printViaHiddenIframe(html, docTitle);
}

/**
 * Export complete semester database and attachments into a single .zip file using JSZip
 * (tugas presentasi, dokumen UTS, UAS, nilai kuis, dan data pendukung dalam satu arsip terpadu)
 */
export async function exportAllTasksToZip(db: SiakadDatabase): Promise<void> {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().slice(0, 10);
  const semesterStr = (db.courseProfile?.semester || 'Ganjil_2026').replace(/[^a-zA-Z0-9_-]/g, '_');
  const courseStr = (db.courseProfile?.courseTitle || 'Filsafat_Ilmu').replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Manifest / Readme
  const readmeContent = `========================================================================
ARSIP CADANGAN TERPADU SEMESTER - SISTEM INFORMASI AKADEMIK (SIAKAD)
Program Magister (S2) Manajemen Pendidikan Islam (MPI 1)
========================================================================
Mata Kuliah      : ${db.courseProfile?.courseTitle || 'Filsafat Ilmu'} (${db.courseProfile?.courseCode || 'MPI-501'})
Dosen Pengampu   : ${db.courseProfile?.dosenName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}
Semester         : ${db.courseProfile?.semester || 'Semester Ganjil 2026/2027'}
Tanggal Arsip    : ${new Date().toLocaleString('id-ID')}
Format Arsip     : ZIP Standar Terpadu (SIAKAD Vault Engine)

RINGKASAN CAKUPAN DATA:
- Total Mahasiswa                 : ${db.students?.length || 0} Mahasiswa
- Total Tugas Presentasi Masuk    : ${db.submissions?.length || 0} Pengumpulan
- Total Lembar Jawaban UTS        : ${db.utsSubmissions?.length || 0} Mahasiswa
- Total Proyek Video UAS          : ${db.groups?.filter(g => g.submission).length || 0} Kelompok
- Total Partisipasi Kuis          : ${db.quizSubmissions?.length || 0} Mahasiswa
- Total Sesi Presensi             : 16 Pertemuan Akademik

STRUKTUR DIREKTORI BERKAS ARSIP INI:
1. database_siakad_semester.json    -> Basis data lengkap untuk restorasi sistem
2. rekap_nilai_mahasiswa.csv         -> Rekap nilai format tabel spreadsheet
3. laporan_rekap_nilai_dan_tugas.html -> Laporan resmi siap cetak / PDF dengan kop & tanda tangan
4. tugas_presentasi/                -> Rekapan pengumpulan makalah, slide PPTX/PDF & tautan Canva
5. ujian_uts/                       -> Lembar jawaban 5 esai UTS, skor penilaian & analisis deteksi AI
6. ujian_uas/                       -> Laporan proyek video kelompok UAS & tautan YouTube/Drive
7. absensi_kehadiran/               -> Rekap presensi 16 pertemuan mahasiswa
8. kuis_interaktif/                 -> Rekap perolehan skor cerdas cermat kuis game
========================================================================`;
  zip.file('README_ARSIP_SEMESTER.txt', readmeContent);

  // 2. Complete Database JSON for instant one-click restoration
  zip.file('database_siakad_semester.json', JSON.stringify(db, null, 2));

  // 3. Spreadsheet CSV of Student Grades
  const csvHeaders = ['No', 'NIM', 'Nama Mahasiswa', 'Part RPS', 'Presensi (15%)', 'Sikap (10%)', 'Tugas PPT/Makalah (25%)', 'UTS (25%)', 'UAS (25%)', 'Nilai Akhir', 'Huruf Mutu', 'Status Kelulusan', 'Catatan'];
  const csvRows = (db.students || []).map((std, idx) => {
    const g = db.grades?.[std.id] || { attendanceScore: 100, attitudeScore: 85, individualScore: 85, utsScore: 85, uasScore: 85, finalScore: 88, letterGrade: 'A-' };
    return [
      idx + 1,
      `"${std.nim}"`,
      `"${std.name}"`,
      `"${std.rpsPart}"`,
      g.attendanceScore,
      g.attitudeScore,
      g.individualScore,
      g.utsScore ?? 85,
      g.uasScore ?? 85,
      g.finalScore,
      `"${g.letterGrade}"`,
      `"${g.finalScore >= 65 ? 'LULUS' : 'EVALUASI'}"`,
      `"${((g as any).notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });
  zip.file('rekap_nilai_mahasiswa.csv', [csvHeaders.join(','), ...csvRows].join('\n'));

  // 4. Standalone Printable HTML Report
  const printableHtml = generateRekapNilaiDanTugasHtml({
    campusName: db.courseProfile?.campusName || 'STAI Syarif Muhammad Jarinabi',
    dosenFullName: db.courseProfile?.dosenName || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
    courseTitle: db.courseProfile?.courseTitle || 'Filsafat Ilmu',
    courseCode: db.courseProfile?.courseCode || 'MPI-501',
    sks: db.courseProfile?.sks || 3,
    semester: db.courseProfile?.semester || 'Semester Ganjil 2026/2027',
    studyProgram: db.courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)',
    students: db.students || [],
    grades: db.grades || {},
    submissions: db.submissions || [],
    utsSubmissions: db.utsSubmissions || [],
    uasSubmissions: db.uasSubmissions || [],
    groups: db.groups || [],
    quizSubmissions: db.quizSubmissions || [],
  });
  zip.file('laporan_rekap_nilai_dan_tugas.html', printableHtml);

  // 5. Folder: tugas_presentasi
  const presFolder = zip.folder('tugas_presentasi');
  if (presFolder) {
    let presSummary = `REKAPITULASI PENGUMPULAN TUGAS PRESENTASI (PPT & MAKALAH)\n=======================================================\n\n`;
    (db.submissions || []).forEach((sub, idx) => {
      const stdObj = (db.students || []).find(s => s.id === sub.studentId);
      const studentNim = stdObj?.nim || (sub as any).nim || `mhs${idx + 1}`;
      const safeNim = studentNim.replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = (sub.studentName || 'Mahasiswa').replace(/[^a-zA-Z0-9_-]/g, '_');

      presSummary += `[#${idx + 1}] ${sub.studentName} (${studentNim}) - ${sub.rpsPart}\n`;
      presSummary += `  Topik: ${sub.topic || '-'}\n`;
      presSummary += `  Format: ${sub.presentationType || 'individu'}\n`;
      presSummary += `  Waktu Kirim: ${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'}\n`;
      presSummary += `  PPT Link: ${sub.pptUrl || '-'}\n`;
      presSummary += `  Makalah Link: ${sub.makalahUrl || '-'}\n`;
      presSummary += `  Nilai Dosen: ${sub.grade !== undefined ? sub.grade : 'Belum Dinilai'}\n`;
      presSummary += `  Catatan Mahasiswa: ${sub.notes || '-'}\n\n`;

      // Extract binary base64 files if stored directly
      if (sub.pptFileData && sub.pptFileData.startsWith('data:')) {
        const parts = sub.pptFileData.split(',');
        if (parts.length > 1) {
          const ext = sub.pptFileName ? sub.pptFileName.split('.').pop() : 'pptx';
          presFolder.file(`lampiran_berkas/PPT_${safeNim}_${safeName}.${ext}`, parts[1], { base64: true });
        }
      }
      if (sub.makalahFileData && sub.makalahFileData.startsWith('data:')) {
        const parts = sub.makalahFileData.split(',');
        if (parts.length > 1) {
          const ext = sub.makalahFileName ? sub.makalahFileName.split('.').pop() : 'pdf';
          presFolder.file(`lampiran_berkas/Makalah_${safeNim}_${safeName}.${ext}`, parts[1], { base64: true });
        }
      }
    });
    presFolder.file('00_DAFTAR_STATUS_PENGUMPULAN.txt', presSummary);
  }

  // 6. Folder: ujian_uts
  const utsFolder = zip.folder('ujian_uts');
  if (utsFolder) {
    let utsSummary = `REKAPITULASI PENGUMPULAN LEMBAR JAWABAN UTS (5 ESSAY)\n===================================================\n\n`;
    (db.utsSubmissions || []).forEach((u, idx) => {
      const std = (db.students || []).find(s => s.id === u.studentId);
      const name = std?.name || u.studentName || `Mahasiswa ${idx + 1}`;
      const nim = std?.nim || '-';

      utsSummary += `[#${idx + 1}] ${name} (${nim})\n`;
      utsSummary += `  Waktu Kirim: ${u.submittedAt ? new Date(u.submittedAt).toLocaleString('id-ID') : '-'}\n`;
      utsSummary += `  Nilai UTS: ${u.grade !== undefined ? u.grade : 'Belum Dinilai'}\n`;
      utsSummary += `  Deteksi AI: ${u.aiDetectionScore !== undefined ? `${u.aiDetectionScore}% (${u.aiVerdict || 'Analisis Orisinalitas'})` : 'Tidak Terdeteksi'}\n`;
      if (u.feedback) utsSummary += `  Feedback Dosen: ${u.feedback}\n`;
      utsSummary += `  Jawaban Soal:\n`;

      if (u.answers) {
        Object.entries(u.answers).forEach(([qNum, ans]) => {
          utsSummary += `    - Nomor ${qNum}: ${typeof ans === 'string' ? ans.slice(0, 150) : ''}...\n`;
        });
      }
      utsSummary += `\n---------------------------------------------------\n\n`;

      // Extract binary UTS attachment if available
      if (u.fileData && u.fileData.startsWith('data:')) {
        const m = u.fileData.match(/^data:([A-Za-z0-9+/=;.-]+);base64,(.+)$/);
        if (m && m[2]) {
          const safeName = (u.studentName || 'mhs').replace(/[^a-zA-Z0-9]/g, '_');
          utsFolder.file(`${u.studentId}_${safeName}_berkas_uts.pdf`, m[2], { base64: true });
        }
      }
    });
    utsFolder.file('00_REKAP_PENGUMPULAN_UTS.txt', utsSummary);
  }

  // 7. Folder: ujian_uas
  const uasFolder = zip.folder('ujian_uas');
  if (uasFolder) {
    let uasSummary = `REKAPITULASI PROYEK VIDEO & LEMBAR JAWABAN UAS\n===============================================\n\n`;
    
    // Group Projects
    uasSummary += `[PROYEK VIDEO KELOMPOK UAS]\n`;
    (db.groups || []).forEach(grp => {
      uasSummary += `[Kelompok ${grp.id}] "${grp.title}"\n`;
      uasSummary += `  Anggota: ${(grp.members || []).join(', ')}\n`;
      uasSummary += `  Nilai UAS: ${grp.grade !== undefined ? grp.grade : 'Belum Dinilai'}\n`;
      if (grp.submission) {
        uasSummary += `  Tautan Video: ${grp.submission.videoUrl || '-'}\n`;
        uasSummary += `  Tool AI Digunakan: ${grp.submission.aiToolsUsed || '-'}\n`;
        uasSummary += `  Ringkasan: ${grp.submission.summaryNotes || '-'}\n`;
      } else {
        uasSummary += `  Status: Belum ada pengumpulan video\n`;
      }
      uasSummary += `\n`;
    });

    // Individual UAS Submissions
    if (db.uasSubmissions && db.uasSubmissions.length > 0) {
      uasSummary += `\n[LEMBAR JAWABAN INDIVIDU UAS]\n`;
      db.uasSubmissions.forEach(uasSub => {
        uasSummary += `• ${uasSub.studentName} (ID: ${uasSub.studentId})\n`;
        uasSummary += `  Waktu: ${uasSub.submittedAt}\n`;
        uasSummary += `  Nilai: ${uasSub.grade ?? 'Belum Dinilai'}\n`;
        if (uasSub.docLink) uasSummary += `  Dokumen Link: ${uasSub.docLink}\n`;
        uasSummary += `\n`;

        if (uasSub.fileData && uasSub.fileData.startsWith('data:')) {
          const m = uasSub.fileData.match(/^data:([A-Za-z0-9+/=;.-]+);base64,(.+)$/);
          if (m && m[2]) {
            const safeName = (uasSub.studentName || 'mhs').replace(/[^a-zA-Z0-9]/g, '_');
            uasFolder.file(`${uasSub.studentId}_${safeName}_berkas_uas.pdf`, m[2], { base64: true });
          }
        }
      });
    }

    uasFolder.file('00_REKAP_UAS.txt', uasSummary);
  }

  // 8. Folder: absensi_kehadiran
  const attFolder = zip.folder('absensi_kehadiran');
  if (attFolder) {
    let attSummary = `REKAPITULASI PRESENSI 16 PERTEMUAN\n=================================\n\n`;
    (db.students || []).forEach(std => {
      const g = db.grades?.[std.id];
      attSummary += `${std.nim} - ${std.name}: ${g?.attendanceScore ?? 100}% Kehadiran\n`;
    });
    attFolder.file('00_REKAP_PRESENSI.txt', attSummary);
  }

  // 9. Folder: kuis_interaktif
  const quizFolder = zip.folder('kuis_interaktif');
  if (quizFolder) {
    let quizSummary = `REKAPITULASI HASIL KUIS GAME INTERAKTIF\n====================================\n\n`;
    (db.quizSubmissions || []).forEach((q, idx) => {
      quizSummary += `[#${idx + 1}] ${q.studentName || 'Mahasiswa'}: Skor ${q.score} Poin (${q.correctCount}/${q.totalQuestions} Benar)\n`;
    });
    quizFolder.file('00_HASIL_KUIS.txt', quizSummary);
  }

  // Generate zip archive blob with compression
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SIAKAD_BACKUP_SEMESTER_${courseStr}_${semesterStr}_${timestamp}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExportExamSheetOptions {
  examType: 'UTS' | 'UAS';
  campusName?: string;
  dosenFullName?: string;
  courseTitle?: string;
  courseCode?: string;
  sks?: number;
  semester?: string;
  studyProgram?: string;
  academicYear?: string;
  questions: UtsQuestion[];
  student?: Student;
  submission?: UtsSubmission;
}

/**
 * Generate official printable HTML exam sheet for UTS or UAS
 */
export function generateExamSheetPrintHtml(options: ExportExamSheetOptions): string {
  const {
    examType,
    campusName = 'STAI Jarinabi',
    dosenFullName = 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
    courseTitle = 'Filsafat Ilmu',
    courseCode = 'MPI-501',
    sks = 3,
    semester = 'Semester Ganjil 2026/2027',
    studyProgram = 'Manajemen Pendidikan Islam (MPI 1)',
    academicYear = '2026/2027',
    questions = [],
    student,
    submission,
  } = options;

  const examTitle = examType === 'UTS'
    ? 'UJIAN TENGAH SEMESTER (UTS) - EVALUASI ESAI KRITIS'
    : 'UJIAN AKHIR SEMESTER (UAS) - EVALUASI ESAI KOMPREHENSIF';

  const meetingLabel = examType === 'UTS' ? 'Pertemuan Ke-8' : 'Pertemuan Ke-16';

  const questionsHtml = (questions || []).map((q, idx) => {
    const qNum = q.number || (idx + 1);
    const ansText = submission?.answers?.[qNum] || '';
    const qScore = submission?.questionScores?.[qNum];

    return `
      <div style="margin-bottom: 24px; padding: 14px 18px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px dashed #94a3b8; padding-bottom: 6px;">
          <div>
            <span style="font-weight: bold; font-size: 11pt; color: #0f172a;">SOAL NO. ${qNum}</span>
            <span style="color: #475569; font-size: 10pt; margin-left: 8px;">(${q.topic || q.title})</span>
          </div>
          <div style="text-align: right;">
            <span style="font-weight: bold; font-size: 10pt; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; color: #1e293b;">
              Bobot Maks: ${q.maxScore || 20} Poin
            </span>
            ${qScore !== undefined ? `<span style="font-weight: bold; font-size: 10pt; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; margin-left: 4px;">Nilai: ${qScore}</span>` : ''}
          </div>
        </div>

        <div style="font-size: 10.5pt; color: #1e293b; line-height: 1.5; margin-bottom: 10px; font-weight: 500;">
          ${q.question}
        </div>

        ${q.rubric ? `
          <div style="font-size: 9pt; color: #64748b; margin-bottom: 10px; font-style: italic;">
            <strong>Kriteria / Rubrik:</strong> ${q.rubric}
          </div>
        ` : ''}

        <div style="margin-top: 10px; border: 1px solid #94a3b8; border-radius: 6px; padding: 12px; background: #ffffff;">
          <div style="font-size: 9pt; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
            Lembar Jawaban Mahasiswa:
          </div>
          <div style="font-size: 10pt; color: #0f172a; line-height: 1.5; white-space: pre-wrap; min-height: ${ansText ? '40px' : '90px'};">
            ${ansText ? ansText : '<span style="color: #94a3b8; font-style: italic;">[ Ruang Kosong Jawaban Mahasiswa / Tulis Tangan ]</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${examType} - ${student?.name || 'Lembar Soal'} - ${courseTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          color: #0f172a;
          line-height: 1.4;
          background: #ffffff;
          margin: 0;
          padding: 10px;
        }
        .kop-surat {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .inst-title {
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
          color: #0f172a;
        }
        .prodi-title {
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 3px 0;
          color: #1e293b;
        }
        .sub-kop {
          font-size: 9.5pt;
          color: #475569;
          margin: 0;
        }
        .doc-badge {
          text-align: center;
          margin: 14px 0 16px 0;
        }
        .doc-badge h2 {
          font-size: 12.5pt;
          font-weight: bold;
          text-transform: uppercase;
          text-decoration: underline;
          margin: 0 0 4px 0;
          color: #0f172a;
        }
        .doc-badge span {
          font-size: 10pt;
          color: #475569;
          font-style: italic;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          font-size: 10pt;
        }
        .meta-table td {
          padding: 4px 6px;
          vertical-align: top;
        }
        .signature-table {
          width: 100%;
          margin-top: 25px;
          border-collapse: collapse;
          page-break-inside: avoid;
        }
        .signature-table td {
          vertical-align: top;
          font-size: 10.5pt;
        }
      </style>
    </head>
    <body>
      <div class="kop-surat">
        <p class="sub-kop">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
        <h1 class="inst-title">${campusName}</h1>
        <p class="prodi-title">PROGRAM STUDI ${studyProgram}</p>
        <p class="sub-kop">Sistem Informasi Akademik (SIAKAD) Terpadu • Tahun Akademik ${academicYear}</p>
      </div>

      <div class="doc-badge">
        <h2>${examTitle}</h2>
        <span>Evaluasi Akademik Resmi (${meetingLabel}) • Bobot Penilaian: 25%</span>
      </div>

      <table class="meta-table" border="1" bordercolor="#cbd5e1">
        <tr>
          <td width="20%"><strong>Mata Kuliah</strong></td>
          <td width="30%">: ${courseTitle} (${courseCode})</td>
          <td width="20%"><strong>Nama Mahasiswa</strong></td>
          <td width="30%">: <strong>${student?.name || '...........................................'}</strong></td>
        </tr>
        <tr>
          <td><strong>Bobot / SKS</strong></td>
          <td>: ${sks} SKS</td>
          <td><strong>NIM / Kelompok</strong></td>
          <td>: ${student?.nim || '...................'} / Kelompok ${student?.groupId || 1}</td>
        </tr>
        <tr>
          <td><strong>Semester / Prodi</strong></td>
          <td>: ${semester} / ${studyProgram}</td>
          <td><strong>Status Ujian</strong></td>
          <td>: ${submission?.submittedAt ? `Terkumpul (${new Date(submission.submittedAt).toLocaleDateString('id-ID')})` : 'Lembar Soal Ujian'}</td>
        </tr>
        <tr>
          <td><strong>Dosen Pengampu</strong></td>
          <td>: ${dosenFullName}</td>
          <td><strong>Nilai Akhir Ujian</strong></td>
          <td>: ${submission?.grade !== undefined ? `<strong>${submission.grade} / 100</strong>` : 'Menunggu Penilaian'}</td>
        </tr>
      </table>

      <div style="margin-bottom: 16px; padding: 8px 12px; background: #f1f5f9; border-left: 4px solid #0f172a; font-size: 9.5pt;">
        <strong>PETUNJUK PENGERJAAN:</strong> Jawablah soal-soal berikut secara analitis, kritis, dan komprehensif mengacu pada silabus RPS. Hindari plagiasi dan kutipan tanpa sumber yang sah.
      </div>

      ${questionsHtml}

      ${submission?.feedback ? `
        <div style="margin-top: 16px; padding: 12px; border: 1px solid #86efac; background: #f0fdf4; border-radius: 8px; font-size: 10pt; color: #166534;">
          <strong>Catatan & Umpan Balik Dosen Pengampu:</strong><br/>
          ${submission.feedback}
        </div>
      ` : ''}

      <table class="signature-table">
        <tr>
          <td width="50%" align="center">
            <p>Mengetahui,<br/>Mahasiswa yang Diuji,</p>
            <div style="height: 60px;"></div>
            <p><strong>${student?.name || '.......................................'}</strong><br/>NIM. ${student?.nim || '.........................'}</p>
          </td>
          <td width="50%" align="center">
            <p>Pasuruan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Dosen Pengampu Mata Kuliah,</p>
            <div style="height: 60px; display: flex; align-items: center; justify-content: center;">
              <img src="${DOSEN_SIGNATURE_BASE64}" alt="Tanda Tangan Dosen" style="max-height: 55px; opacity: 0.9;" />
            </div>
            <p><strong>${dosenFullName}</strong><br/>NIDN/NIP. 19980515 202601 2 001</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Print Exam Sheet directly or trigger PDF dialog
 */
export function printExamSheetPdf(options: ExportExamSheetOptions): void {
  const html = generateExamSheetPrintHtml(options);
  const title = `${options.examType}_${options.student?.name || 'Soal'}_${options.courseTitle || 'SIAKAD'}`;
  printViaHiddenIframe(html, title);
}

/**
 * Download Exam Sheet as formatted Microsoft Word document (.doc)
 */
export function exportExamSheetToWord(options: ExportExamSheetOptions): void {
  const html = generateExamSheetPrintHtml(options);
  const wordDocument = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${options.examType} - ${options.student?.name || 'Soal'}</title>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
  const blob = new Blob([wordDocument], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${options.examType}_${(options.student?.name || 'SOAL').replace(/\s+/g, '_')}_${(options.courseTitle || 'MK').replace(/\s+/g, '_')}.doc`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate official printable HTML for Quiz Recap and ranking
 */
export function generateQuizRecapPrintHtml(options: {
  campusName?: string;
  dosenFullName?: string;
  courseTitle?: string;
  submissions: QuizSubmission[];
}): string {
  const {
    campusName = 'STAI Jarinabi',
    dosenFullName = 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
    courseTitle = 'Filsafat Ilmu',
    submissions = [],
  } = options;

  const sorted = [...submissions].sort((a, b) => b.score - a.score);

  const rows = sorted.map((s, idx) => `
    <tr>
      <td style="text-align: center; padding: 6px; border: 1px solid #333;">${idx + 1}</td>
      <td style="padding: 6px; border: 1px solid #333; font-weight: bold;">${s.studentName || 'Mahasiswa'}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #333; font-weight: bold; background: #ecfdf5;">${s.score}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #333;">${s.correctCount} / ${s.totalQuestions || 10}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #333;">${s.cameraVerified ? '✓ Terverifikasi AI' : 'Belum Kamera'}</td>
      <td style="text-align: center; padding: 6px; border: 1px solid #333; font-size: 9pt;">${s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('id-ID') : '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Rekapitulasi Kuis Interaktif - ${courseTitle}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; margin: 20px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        th { background: #f1f5f9; border: 1px solid #333; padding: 8px 4px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2 style="margin: 0; text-transform: uppercase;">${campusName}</h2>
        <p style="margin: 3px 0; font-size: 11pt;">PROGRAM STUDI MANAJEMEN PENDIDIKAN ISLAM (MPI 1)</p>
        <h3 style="margin: 10px 0 4px 0; text-decoration: underline;">REKAPITULASI HASIL KUIS GAME INTERAKTIF RPS</h3>
        <p style="margin: 0; font-size: 10pt;">Mata Kuliah: ${courseTitle} • Dosen: ${dosenFullName}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th width="8%">Peringkat</th>
            <th>Nama Mahasiswa</th>
            <th width="15%">Skor Kuis (0-100)</th>
            <th width="15%">Jawaban Benar</th>
            <th width="18%">Pengawasan Kamera</th>
            <th width="18%">Waktu Kirim</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : '<tr><td colspan="6" style="text-align:center; padding:15px; color:#666;">Belum ada mahasiswa yang menyelesaikan kuis</td></tr>'}
        </tbody>
      </table>

      <div style="margin-top: 30px; text-align: right;">
        <p>Pasuruan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Dosen Pengampu,</p>
        <div style="height: 50px; display: flex; justify-content: flex-end;">
          <img src="${DOSEN_SIGNATURE_BASE64}" style="max-height: 48px;" alt="TTD Dosen"/>
        </div>
        <p><strong>${dosenFullName}</strong></p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Print Quiz Recap as official PDF
 */
export function printQuizRecapPdf(options: {
  campusName?: string;
  dosenFullName?: string;
  courseTitle?: string;
  submissions: QuizSubmission[];
}): void {
  const html = generateQuizRecapPrintHtml(options);
  printViaHiddenIframe(html, `Rekap_Kuis_${options.courseTitle || 'SIAKAD'}`);
}
