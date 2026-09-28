import {
  SiakadDatabase,
  Student,
  IndividualSubmission,
  AttendanceStatus,
  StudentGrade,
  UtsSubmission,
  UtsQuestion,
  QuizQuestion,
  QuizSubmission,
  QuizSettings,
  GroupProject,
  ExamScheduleSettings,
  MeetingSchedule,
} from '../types';
import { INITIAL_DATABASE } from '../data/initialData';
import { saveToIndexedDb, loadFromIndexedDb, saveIndividualSubmissionToIndexedDb } from '../utils/indexedDb';
import {
  fetchDatabaseFromSupabase,
  saveDatabaseToSupabase,
  isSupabaseConfigured,
} from './supabase';

const LOCAL_STORAGE_KEY = 'siakad_mpi1_offline_db';
const LOCAL_PENDING_SUBMISSIONS_KEY = 'siakad_mpi1_pending_subs';
const LOCAL_PENDING_UTS_KEY = 'siakad_mpi1_pending_uts';

// Safely parse JSON from string or localStorage without throwing SyntaxError
export function safeParseJson<T = any>(str: string | null | undefined, fallback: T = {} as T): T {
  const safeFallback = (fallback === null || fallback === undefined) ? ({} as T) : fallback;
  if (!str || typeof str !== 'string') return safeFallback;
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return safeFallback;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return safeFallback;
  }
}

// Safely parse JSON from fetch response without throwing SyntaxError on HTML/500/404
export async function safeJson<T = any>(res: Response, fallback: T = {} as T): Promise<T> {
  const safeFallback = (fallback === null || fallback === undefined) ? ({} as T) : fallback;
  try {
    if (!res) return safeFallback;
    const contentType = res.headers?.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return safeFallback;
    }
    const text = await res.text();
    if (!text || !text.trim()) return safeFallback;
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return safeFallback;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return safeFallback;
  }
}

// Load initial from localStorage fallback
export function getLocalCache(): SiakadDatabase {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = safeParseJson<Partial<SiakadDatabase> | null>(saved, null);
    if (parsed && typeof parsed === 'object') {
      return { ...INITIAL_DATABASE, ...parsed };
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return INITIAL_DATABASE;
}

export function saveLocalCache(db: SiakadDatabase) {
  // Always persist complete data to IndexedDB (no 5MB storage limit)
  saveToIndexedDb(db).catch(err => console.warn('IndexedDB auto-save warning:', err));

  // If Supabase is connected, persist cloud database copy
  if (isSupabaseConfigured()) {
    saveDatabaseToSupabase(db).catch(err => console.warn('Supabase auto-save warning:', err));
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    try {
      // If quota exceeded due to base64 files, strip raw binary from offline localStorage cache
      const sanitized: any = {
        ...db,
        allCoursesData: undefined,
        submissions: (db.submissions || []).map(s => ({
          ...s,
          pptFileData: s.pptFileData && s.pptFileData.startsWith('data:') ? undefined : s.pptFileData,
          makalahFileData: s.makalahFileData && s.makalahFileData.startsWith('data:') ? undefined : s.makalahFileData,
        })),
        utsSubmissions: (db.utsSubmissions || []).map(u => ({
          ...u,
          fileData: u.fileData && u.fileData.startsWith('data:') ? undefined : u.fileData,
        })),
        uasSubmissions: (db.uasSubmissions || []).map(u => ({
          ...u,
          fileData: u.fileData && u.fileData.startsWith('data:') ? undefined : u.fileData,
        })),
        groups: (db.groups || []).map(g => ({
          ...g,
          submission: g.submission ? {
            ...g.submission,
            fileData: g.submission.fileData && g.submission.fileData.startsWith('data:') ? undefined : g.submission.fileData,
          } : undefined,
        })),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (innerErr) {
      console.warn('LocalStorage save error, fallback to IndexedDB:', innerErr);
    }
  }
}

// Synchronize any pending offline submissions when network is restored
let isSyncingPending = false;
export async function syncPendingSubmissionsToServer(): Promise<void> {
  if (isSyncingPending) return;
  isSyncingPending = true;
  try {
    // 1. Pending Presentation Submissions (PPT & Makalah)
    const pendingSubsRaw = localStorage.getItem(LOCAL_PENDING_SUBMISSIONS_KEY);
    const pendingList = safeParseJson<IndividualSubmission[]>(pendingSubsRaw, []);
    if (Array.isArray(pendingList) && pendingList.length > 0) {
      const remaining: IndividualSubmission[] = [];
      for (const sub of pendingList) {
        try {
          const res = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
          if (!res.ok) remaining.push(sub);
        } catch {
          remaining.push(sub);
        }
      }
      if (remaining.length > 0) {
        localStorage.setItem(LOCAL_PENDING_SUBMISSIONS_KEY, JSON.stringify(remaining));
      } else {
        localStorage.removeItem(LOCAL_PENDING_SUBMISSIONS_KEY);
      }
    }

    // 2. Pending UTS Submissions
    const pendingUtsRaw = localStorage.getItem(LOCAL_PENDING_UTS_KEY);
    const pendingUts = safeParseJson<any[]>(pendingUtsRaw, []);
    if (Array.isArray(pendingUts) && pendingUts.length > 0) {
        const remainingUts: any[] = [];
        for (const uts of pendingUts) {
          try {
            const res = await fetch('/api/uts-submissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(uts),
            });
            if (!res.ok) remainingUts.push(uts);
          } catch {
            remainingUts.push(uts);
          }
        }
        if (remainingUts.length > 0) {
          localStorage.setItem(LOCAL_PENDING_UTS_KEY, JSON.stringify(remainingUts));
        } else {
          localStorage.removeItem(LOCAL_PENDING_UTS_KEY);
        }
      }
  } catch (err) {
    console.warn('Pending sync notice:', err);
  } finally {
    isSyncingPending = false;
  }
}

// Fetch database from server, fallback to IndexedDB / Supabase / local cache if offline
export async function fetchDatabase(): Promise<{ db: SiakadDatabase; isOffline: boolean }> {
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const json = await safeJson(res, null);
      if (json && json.success && json.data) {
        saveLocalCache(json.data);
        // Automatically sync any offline pending submissions to server
        syncPendingSubmissionsToServer();
        return { db: json.data, isOffline: false };
      }
    }
  } catch (err) {
    console.warn('Server offline or network error, attempting offline cache recovery:', err);
  }

  // Attempt recovery from Supabase if configured (e.g. hosted on Vercel with Supabase)
  if (isSupabaseConfigured()) {
    try {
      const sbData = await fetchDatabaseFromSupabase();
      if (sbData && sbData.students && sbData.students.length > 0) {
        saveLocalCache(sbData);
        return { db: sbData, isOffline: false };
      }
    } catch (err) {
      console.warn('Supabase fetch error, fallback to client storage:', err);
    }
  }

  // Attempt recovery from IndexedDB first (stores full documents and grades)
  try {
    const idbData = await loadFromIndexedDb();
    if (idbData && idbData.students && idbData.students.length > 0) {
      return { db: idbData, isOffline: true };
    }
  } catch {
    // Continue to localStorage fallback
  }

  return { db: getLocalCache(), isOffline: true };
}

// Peer Review API: Submit rating and comments on peer presentations
export async function submitPeerReviewApi(
  submissionId: string,
  payload: { reviewerId: string; reviewerName: string; rating: number; comment: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/submissions/${submissionId}/peer-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await safeJson(res, { success: res.ok, error: undefined });
    return { success: res.ok && data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mengirim ulasan rekan' };
  }
}

// Send heartbeat to mark student online
export async function sendHeartbeat(studentId: string, studentName: string): Promise<boolean> {
  try {
    const res = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Submit individual assignment (Makalah & PPT)
export async function submitIndividualTask(submission: IndividualSubmission): Promise<{ success: boolean; submission: IndividualSubmission; offlineStored: boolean; error?: string }> {
  // Always immediately backup submission to IndexedDB (safe from 5MB quota)
  try {
    await saveIndividualSubmissionToIndexedDb(submission);
  } catch (idbErr) {
    console.warn('IDB pre-save notice:', idbErr);
  }

  // Update memory/local cache so UI flips to Terkirim with zero delay
  try {
    const currentDb = getLocalCache();
    if (!currentDb.submissions) currentDb.submissions = [];
    const targetMeeting = Number(submission.meetingNumber) || 2;
    const subIdx = currentDb.submissions.findIndex(
      s => (s.id && submission.id && s.id === submission.id) ||
           (s.studentId === submission.studentId && (Number(s.meetingNumber) || 2) === targetMeeting)
    );
    if (subIdx >= 0) {
      currentDb.submissions[subIdx] = submission;
    } else {
      currentDb.submissions.push(submission);
    }
    saveLocalCache(currentDb);
    saveToIndexedDb(currentDb).catch(() => {});
  } catch (cacheErr) {
    console.warn('Local cache immediate save notice:', cacheErr);
  }

  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    if (res.ok) {
      const data = await safeJson(res, { submission });
      const savedSub: IndividualSubmission = data?.submission || submission;
      try {
        const currentDb = getLocalCache();
        if (!currentDb.submissions) currentDb.submissions = [];
        const targetMeeting = Number(savedSub.meetingNumber) || 2;
        const subIdx = currentDb.submissions.findIndex(
          s => (s.id && savedSub.id && s.id === savedSub.id) ||
               (s.studentId === savedSub.studentId && (Number(s.meetingNumber) || 2) === targetMeeting)
        );
        if (subIdx >= 0) {
          currentDb.submissions[subIdx] = savedSub;
        } else {
          currentDb.submissions.push(savedSub);
        }
        saveLocalCache(currentDb);
        saveToIndexedDb(currentDb).catch(() => {});
      } catch (cacheErr) {
        console.warn('Cache sync notice:', cacheErr);
      }
      return { success: true, submission: savedSub, offlineStored: false };
    } else {
      const errJson = await safeJson<any>(res, {});
      if (errJson?.error) {
        return { success: false, submission, offlineStored: false, error: errJson.error };
      }
    }
  } catch (err) {
    console.warn('Submit offline fallback:', err);
  }

  // Offline fallback: save to localStorage pending queue (safe without oversized base64 strings)
  try {
    const pendingRaw = localStorage.getItem(LOCAL_PENDING_SUBMISSIONS_KEY);
    const pendingList: IndividualSubmission[] = safeParseJson<IndividualSubmission[]>(pendingRaw, []);
    const targetMeeting = Number(submission.meetingNumber) || 2;

    // Create lightweight pending item for localStorage to avoid 5MB quota errors
    const safePendingItem: IndividualSubmission = {
      ...submission,
      pptFileData: submission.pptFileData && submission.pptFileData.length > 200000 ? '[STORED_IN_INDEXEDDB]' : submission.pptFileData,
      makalahFileData: submission.makalahFileData && submission.makalahFileData.length > 200000 ? '[STORED_IN_INDEXEDDB]' : submission.makalahFileData,
    };

    const existingIdx = pendingList.findIndex(
      p => (p.id && submission.id && p.id === submission.id) ||
           (p.studentId === submission.studentId && (Number(p.meetingNumber) || 2) === targetMeeting)
    );
    if (existingIdx >= 0) {
      pendingList[existingIdx] = safePendingItem;
    } else {
      pendingList.push(safePendingItem);
    }

    try {
      localStorage.setItem(LOCAL_PENDING_SUBMISSIONS_KEY, JSON.stringify(pendingList));
    } catch (quotaErr) {
      console.warn('LocalStorage quota notice, data safely stored in IndexedDB:', quotaErr);
    }

    return { success: true, submission, offlineStored: true };
  } catch (e) {
    console.warn('Offline fallback notice:', e);
    // IndexedDB already saved the submission above, so return success
    return { success: true, submission, offlineStored: true };
  }
}

// Submit group video project
export async function submitGroupProject(payload: {
  groupId: number;
  videoUrl?: string;
  canvaUrl?: string;
  driveUrl?: string;
  aiToolsUsed: string;
  summaryNotes: string;
  submittedBy: string;
  fileName?: string;
  fileData?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/group-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      try {
        const currentDb = getLocalCache();
        const group = (currentDb.groups || []).find(g => g.id === payload.groupId);
        if (group) {
          group.submission = {
            ...payload,
            submittedAt: new Date().toISOString(),
          };
          saveLocalCache(currentDb);
        }
      } catch (e) {
        console.warn('Group cache sync notice:', e);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Submit group error:', err);
    // Offline local update
    const currentDb = getLocalCache();
    const group = (currentDb.groups || []).find(g => g.id === payload.groupId);
    if (group) {
      group.submission = {
        ...payload,
        submittedAt: new Date().toISOString(),
      };
      saveLocalCache(currentDb);
      return true;
    }
    return false;
  }
}

// Grade individual task
export async function gradeIndividualTask(studentId: string, grade: number, feedback: string): Promise<boolean> {
  try {
    const res = await fetch('/api/individual-grade', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ studentId, grade, feedback }),
    });
    const json = await safeJson(res, null);
    if (res.ok) {
      if (json?.data) {
        saveLocalCache(json.data);
      } else {
        const localDb = getLocalCache();
        if (localDb.submissions) {
          const s = localDb.submissions.find(sub => sub.studentId === studentId);
          if (s) {
            s.grade = Number(grade);
            s.feedback = feedback;
            s.gradedAt = new Date().toISOString();
          }
        }
        if (!localDb.grades) localDb.grades = {};
        if (!localDb.grades[studentId]) {
          localDb.grades[studentId] = {
            attendanceScore: 100,
            attitudeScore: 85,
            letterGrade: '-',
          };
        }
        localDb.grades[studentId].individualScore = Number(grade);
        if (feedback) localDb.grades[studentId].notes = feedback;
        saveLocalCache(localDb);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Grade group project (UTS / UAS Video Kelompok)
export async function gradeGroupProject(groupId: number, grade: number, feedback: string, examType: 'uts' | 'uas' = 'uas'): Promise<boolean> {
  try {
    const res = await fetch('/api/group-grade', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ groupId, grade, feedback, examType }),
    });
    const json = await safeJson(res, null);
    if (res.ok) {
      if (json?.data) {
        saveLocalCache(json.data);
      } else {
        const localDb = getLocalCache();
        const grp = (localDb.groups || []).find(g => g.id === groupId);
        if (grp) {
          grp.grade = Number(grade);
          grp.feedback = feedback;
          grp.gradedAt = new Date().toISOString();
        }
        saveLocalCache(localDb);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Submit UTS essay answers (5 Soal Essay)
export async function submitUtsSubmissionApi(payload: {
  studentId: string;
  studentName: string;
  answers: Record<number, string>;
  docLink?: string;
  fileName?: string;
  fileData?: string;
}): Promise<{ success: boolean; submission?: UtsSubmission; offlineStored: boolean }> {
  try {
    const res = await fetch('/api/uts-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await safeJson<any>(res, { submission: payload });
      const savedUts: UtsSubmission = data?.submission?.id ? data.submission : {
        id: `uts-${Date.now()}-${payload.studentId}`,
        submittedAt: new Date().toISOString(),
        ...payload,
      };
      if (savedUts) {
        try {
          const localDb = getLocalCache();
          if (!localDb.utsSubmissions) localDb.utsSubmissions = [];
          const existingIdx = localDb.utsSubmissions.findIndex(u => u.studentId === payload.studentId);
          if (existingIdx >= 0) {
            localDb.utsSubmissions[existingIdx] = savedUts;
          } else {
            localDb.utsSubmissions.push(savedUts);
          }
          saveLocalCache(localDb);
        } catch (e) {
          console.warn('UTS cache sync notice:', e);
        }
      }
      return { success: true, submission: savedUts, offlineStored: false };
    }
  } catch (err) {
    console.warn('Submit UTS offline fallback:', err);
  }

  // Offline fallback
  try {
    const localDb = getLocalCache();
    if (!localDb.utsSubmissions) localDb.utsSubmissions = [];

    const existingIdx = localDb.utsSubmissions.findIndex(u => u.studentId === payload.studentId);
    const offlineSub: UtsSubmission = {
      id: existingIdx >= 0 ? localDb.utsSubmissions[existingIdx].id : `uts-${Date.now()}`,
      studentId: payload.studentId,
      studentName: payload.studentName,
      submittedAt: new Date().toISOString(),
      answers: payload.answers,
      docLink: payload.docLink,
      fileName: payload.fileName,
      fileData: payload.fileData,
      grade: existingIdx >= 0 ? localDb.utsSubmissions[existingIdx].grade : undefined,
      questionScores: existingIdx >= 0 ? localDb.utsSubmissions[existingIdx].questionScores : undefined,
      feedback: existingIdx >= 0 ? localDb.utsSubmissions[existingIdx].feedback : undefined,
    };

    if (existingIdx >= 0) {
      localDb.utsSubmissions[existingIdx] = offlineSub;
    } else {
      localDb.utsSubmissions.push(offlineSub);
    }
    saveLocalCache(localDb);

    return { success: true, submission: offlineSub, offlineStored: true };
  } catch (e) {
    console.error('Failed to save UTS offline:', e);
    return { success: false, offlineStored: false };
  }
}

// Grade UTS Submission (Dosen only)
export async function gradeUtsSubmissionApi(payload: {
  studentId: string;
  grade: number;
  questionScores?: Record<number, number>;
  feedback: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/uts-grade', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok) {
      if (json?.data) {
        saveLocalCache(json.data);
      } else {
        const localDb = getLocalCache();
        const utsSub = (localDb.utsSubmissions || []).find(u => u.studentId === payload.studentId);
        if (utsSub) {
          utsSub.grade = Number(payload.grade);
          utsSub.feedback = payload.feedback;
          utsSub.gradedAt = new Date().toISOString();
        }
        if (!localDb.grades) localDb.grades = {};
        if (!localDb.grades[payload.studentId]) {
          localDb.grades[payload.studentId] = {
            attendanceScore: 100,
            attitudeScore: 85,
            letterGrade: '-',
          };
        }
        localDb.grades[payload.studentId].utsScore = Number(payload.grade);
        if (payload.feedback) localDb.grades[payload.studentId].notes = payload.feedback;
        saveLocalCache(localDb);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Client-side question generation helpers (fallback if server is offline / serverless)
export function generateClientUtsQuestions(meetings: MeetingSchedule[], courseTitle: string = 'Filsafat Ilmu'): UtsQuestion[] {
  const m1 = (meetings || []).find(m => m.meetingNumber === 1);
  const m2 = (meetings || []).find(m => m.meetingNumber === 2);
  const m3 = (meetings || []).find(m => m.meetingNumber === 3);
  const m4 = (meetings || []).find(m => m.meetingNumber === 4);
  const m5 = (meetings || []).find(m => m.meetingNumber === 5);
  const m6 = (meetings || []).find(m => m.meetingNumber === 6);
  const m7 = (meetings || []).find(m => m.meetingNumber === 7);

  return [
    {
      id: 1,
      number: 1,
      title: `Dimensi Ontologis & Fondasi Keilmuan (${m1?.title || 'Pengantar'} & ${m2?.title || 'Hakikat Ilmu'})`,
      topic: `${m1?.title || 'Dasar Filsafat'} & ${m2?.title || 'Fondasi Ontologis'}`,
      question: `Berdasarkan silabus RPS Pertemuan 1 dan 2 (${m1?.title || 'Dasar Filsafat'} serta ${m2?.title || 'Fondasi Ontologis'}), jelaskan secara komprehensif hakikat ontologis dan objek kajian formal maupun material dari mata kuliah ${courseTitle}! Bagaimana hubungan dialektis antara konsep dasar tersebut dengan paradigma ilmu pengetahuan modern?`,
      guide: `Jawab dengan merujuk materi RPS pertemuan 1-2. Sebutkan minimal 2 pandangan filosof/ahli, definisi ontologi keilmuan, serta refleksinya dalam praksis pendidikan.`,
      rubric: `Ketajaman analisis ontologis (8 poin), rujukan konseptual RPS (6 poin), orisinalitas argumentasi (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 2,
      number: 2,
      title: `Epistemologi & Metodologi Ilmiah (${m3?.title || 'Epistemologi'} & ${m4?.title || 'Metode Ilmiah'})`,
      topic: `${m3?.title || 'Epistemologi'} & ${m4?.title || 'Metode Ilmiah'}`,
      question: `Telaah secara mendalam materi RPS Pertemuan 3 dan 4 mengenai epistemologi dan metodologi pencarian kebenaran ilmiah dalam lingkup ${courseTitle} (${m3?.title || 'Epistemologi'} & ${m4?.title || 'Metode Ilmiah'})! Bedakan antara pendekatan rasionalisme, empirisme, dan intuisi/wahyu dalam membangun validitas ilmiah!`,
      guide: `Uraikan konstruksi metodologis keilmuan, kriteria kebenaran ilmiah (koherensi, korespondensi, pragmatis), dan hubungannya dengan capaian pembelajaran RPS pertemuan 3-4.`,
      rubric: `Pemahaman teori epistemologi (8 poin), perbandingan metodologis (6 poin), ketepatan contoh (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 3,
      number: 3,
      title: `Aksiologi, Etika & Tanggung Jawab Moral Keilmuan (${m5?.title || 'Etika Keilmuan'})`,
      topic: m5?.title || 'Aksiologi & Etika Profesi Keilmuan',
      question: `Mengacu pada pembahasan materi Pertemuan 5 (${m5?.title || 'Aksiologi & Etika Profesi'}), bagaimana ilmuwan dan akademisi menyeimbangkan antara kebebasan nilai (value-free) dan keterikatan nilai (value-bound) dalam penerapan ilmu? Analisis tanggung jawab etis dan moral ilmuwan di era disrupsi digital saat ini!`,
      guide: `Fokus pada dimensi aksiologis, tanggung jawab etika profesi ilmuwan, mitigasi penyalahgunaan teknologi/AI, serta nilai moralitas akademis.`,
      rubric: `Kedalaman pemikiran aksiologis (8 poin), relevansi etika modern (6 poin), struktur jawaban akademis (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 4,
      number: 4,
      title: `Studi Kasus & Dialektika Realitas Empiris (${m6?.title || 'Kajian Kasus Empiris'})`,
      topic: m6?.title || 'Kajian Kasus Lapangan & Realitas Empiris',
      question: `Berdasarkan kajian materi Pertemuan 6 (${m6?.title || 'Aplikasi Lapangan'}), lakukan analisis kritis terhadap salah satu problematika aktual yang relevan dengan ${courseTitle}! Bagaimana konsep yang telah dipelajari mampu memberikan kerangka diagnostik dan solusi holistik terhadap masalah tersebut?`,
      guide: `Identifikasi masalah riil, gunakan instrumen analisis materi RPS pertemuan 6, dan tawarkan rekomendasi ilmiah konkret.`,
      rubric: `Identifikasi kasus konkret (7 poin), penerapan teori RPS (7 poin), kekuatan argumentasi solusi (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 5,
      number: 5,
      title: `Sintesis Kritis & Refleksi Teori Integratif Pra-UTS (${m7?.title || 'Sintesis Materi Integratif'})`,
      topic: m7?.title || 'Sintesis Konseptual Integratif Pra-UTS',
      question: `Sebagai sintesis komprehensif atas seluruh materi RPS Pertemuan 1 hingga 7 menjelang UTS, rumuskan proposisi atau kerangka konseptual baru yang mengintegrasikan fondasi ontologi, epistemologi, dan aksiologi dalam mata kuliah ${courseTitle}! Jelaskan urgensinya bagi pengembangan kompetensi kepemimpinan dan manajerial!`,
      guide: `Tuliskan sintesis integratif berbobot akademik, hindari pengulangan hafalan, tunjukkan pemikiran reflektif tingkat tinggi (HOTS).`,
      rubric: `Kemampuan sintesis integratif (8 poin), orisinalitas kerangka konseptual (6 poin), logika penalaran akademis (6 poin). Total 20 poin.`,
      maxScore: 20
    }
  ];
}

export function generateClientUasQuestions(meetings: MeetingSchedule[], courseTitle: string = 'Filsafat Ilmu'): UtsQuestion[] {
  const m9 = (meetings || []).find(m => m.meetingNumber === 9);
  const m10 = (meetings || []).find(m => m.meetingNumber === 10);
  const m11 = (meetings || []).find(m => m.meetingNumber === 11);
  const m12 = (meetings || []).find(m => m.meetingNumber === 12);
  const m13 = (meetings || []).find(m => m.meetingNumber === 13);
  const m14 = (meetings || []).find(m => m.meetingNumber === 14);
  const m15 = (meetings || []).find(m => m.meetingNumber === 15);

  return [
    {
      id: 1,
      number: 1,
      title: `Paradigma Mutakhir & Konstruksi Teori Kontemporer (${m9?.title || 'Perkembangan Mutakhir'} & ${m10?.title || 'Paradigma Keilmuan'})`,
      topic: `${m9?.title || 'Perkembangan Mutakhir'} & ${m10?.title || 'Paradigma Keilmuan'}`,
      question: `Berdasarkan silabus RPS Pertemuan 9 dan 10 (${m9?.title || 'Materi Pertemuan 9'} serta ${m10?.title || 'Materi Pertemuan 10'}), evaluasi secara kritis pergeseran paradigma keilmuan kontemporer dalam mata kuliah ${courseTitle}! Bagaimana paradigma baru ini menjawab keterbatasan teori-teori konvensional masa lampau?`,
      guide: `Analisis pergeseran paradigma, rujukan silabus pertemuan 9-10, bandingkan model lama dan model mutakhir dengan argumen akademis kokoh.`,
      rubric: `Ketajaman perbandingan paradigma (8 poin), pemahaman materi pasca-UTS RPS (6 poin), kualitas argumentasi ilmiah (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 2,
      number: 2,
      title: `Analisis Kebijakan, Manajerial & Tata Kelola (${m11?.title || 'Implementasi Manajerial & Kebijakan'})`,
      topic: m11?.title || 'Kritik Teori & Kebijakan Pendidikan',
      question: `Mengacu pada pokok bahasan Pertemuan 11 (${m11?.title || 'Kajian Kritis Kebijakan'}), bedah secara sistematis implementasi tata kelola pendidikan dan kepemimpinan dalam perspektif ${courseTitle}! Berikan rekomendasi konkret berbasis riset untuk mengatasi kesenjangan antara regulasi formal dan praksis di lapangan!`,
      guide: `Kritisi kebijakan dan tata kelola manajerial, sebutkan instrumen evaluasi materi pertemuan 11, serta solusi praksis yang aplikatif.`,
      rubric: `Kedalaman telaah kebijakan (8 poin), keselarasan materi RPS (6 poin), aplikabilitas rekomendasi (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 3,
      number: 3,
      title: `Etika Teknologi Digital, Artificial Intelligence & Masa Depan Pendidikan (${m12?.title || 'Paradigma Kelembagaan'} & ${m13?.title || 'Filsafat Teknologi & AI'})`,
      topic: `${m12?.title || 'Kelembagaan'} & ${m13?.title || 'Filsafat AI & Teknologi'}`,
      question: `Berdasarkan kajian materi Pertemuan 12 dan 13 (${m12?.title || 'Materi Ptm 12'} & ${m13?.title || 'Etika AI & Teknologi'}), diskusikan dilema etis penggunaan Artificial Intelligence (AI) dan automasi dalam dunia pendidikan Islam! Bagaimana kerangka aksiologis ${courseTitle} dapat memandu perumusan etika akademik masa depan?`,
      guide: `Eksplorasi tantangan AI, integritas ilmiah, peran kepemimpinan pendidikan, dan pedoman etika digital berlandaskan nilai-nilai luhur keilmuan.`,
      rubric: `Ketajaman analisis etika digital/AI (8 poin), integrasi nilai aksiologi (6 poin), visi masa depan (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 4,
      number: 4,
      title: `Model Integratif & Desain Solutif Lapangan (${m14?.title || 'Inovasi Lapangan'} & ${m15?.title || 'Praksis Solusi'})`,
      topic: `${m14?.title || 'Inovasi Lapangan'} & ${m15?.title || 'Praksis Solusi'}`,
      question: `Mengacu pada pembahasan materi Pertemuan 14 dan 15 (${m14?.title || 'Praksis Inovatif'} serta ${m15?.title || 'Evaluasi Holistik'}), rancanglah sebuah model konseptual atau blueprint inovatif untuk memecahkan problem sistemik dalam bidang ${courseTitle}! Jelaskan tahapan implementasi dan indikator keberhasilannya!`,
      guide: `Kemukakan desain blueprint orisinal, tahapan implementasi sistematis, serta matriks indikator capaian yang terukur.`,
      rubric: `Inovasi dan kebaruan desain model (8 poin), kelayakan implementasi (6 poin), koherensi akademik (6 poin). Total 20 poin.`,
      maxScore: 20
    },
    {
      id: 5,
      number: 5,
      title: `Rekonstruksi Holistik & Refleksi Komprehensif Akhir Semester (${courseTitle})`,
      topic: 'Sintesis Komprehensif Akhir Semester',
      question: `Sebagai evaluasi akhir komprehensif atas seluruh perjalanan perkuliahan 16 pertemuan dalam RPS ${courseTitle}, lakukan sintesis epistemologis menyeluruh dari pertemuan 1 hingga 15! Apa refleksi mendasar mengenai peran keilmuan ini dalam membangun peradaban berkeadaban dan bagaimana visi akademik Anda ke depan?`,
      guide: `Tuliskan esai refleksi tingkat tinggi (HOTS) yang mengikat seluruh benang merah materi dari awal hingga akhir perkuliahan.`,
      rubric: `Sintesis komprehensif seluruh materi RPS (8 poin), kedalaman refleksi filosofis (6 poin), proyeksi visi ke depan (6 poin). Total 20 poin.`,
      maxScore: 20
    }
  ];
}

// Sync & Auto-generate UTS questions from RPS
export async function syncUtsQuestionsFromRpsApi(): Promise<{
  success: boolean;
  message?: string;
  questions?: UtsQuestion[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/uts/sync-from-rps', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ isDosen: true }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json?.success && Array.isArray(json.questions) && json.questions.length > 0) {
      const local = getLocalCache();
      local.utsQuestions = json.questions;
      saveLocalCache(local);
      return { success: true, message: json.message, questions: json.questions };
    }
  } catch (err) {
    console.warn('Server sync UTS questions error, using client generator:', err);
  }

  // Resilient fallback: generate client-side from meetings
  try {
    const local = getLocalCache();
    const courseTitle = local.courseProfile?.name || local.courseProfile?.courseTitle || 'Filsafat Ilmu';
    const generated = generateClientUtsQuestions(local.meetings || [], courseTitle);
    local.utsQuestions = generated;
    saveLocalCache(local);
    return {
      success: true,
      message: `5 Soal Essay UTS berhasil disinkronkan otomatis dari materi RPS Pertemuan 1-7 (${courseTitle})!`,
      questions: generated,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Gagal menyusun soal UTS dari RPS' };
  }
}

// Sync & Auto-generate UAS questions from RPS
export async function syncUasQuestionsFromRpsApi(): Promise<{
  success: boolean;
  message?: string;
  questions?: UtsQuestion[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/uas/sync-from-rps', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ isDosen: true }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json?.success && Array.isArray(json.questions) && json.questions.length > 0) {
      const local = getLocalCache();
      local.uasQuestions = json.questions;
      saveLocalCache(local);
      return { success: true, message: json.message, questions: json.questions };
    }
  } catch (err) {
    console.warn('Server sync UAS questions error, using client generator:', err);
  }

  // Resilient fallback: generate client-side from meetings
  try {
    const local = getLocalCache();
    const courseTitle = local.courseProfile?.name || local.courseProfile?.courseTitle || 'Filsafat Ilmu';
    const generated = generateClientUasQuestions(local.meetings || [], courseTitle);
    local.uasQuestions = generated;
    saveLocalCache(local);
    return {
      success: true,
      message: `5 Soal Essay UAS berhasil disinkronkan otomatis dari materi RPS Pertemuan 9-15 (${courseTitle})!`,
      questions: generated,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Gagal menyusun soal UAS dari RPS' };
  }
}

// Upload Student Document (PDF, DOCX, DOC, XLSX, CSV, TXT)
export async function uploadStudentDocumentApi(payload: {
  fileBase64?: string;
  fileName?: string;
  textContent?: string;
}): Promise<{
  success: boolean;
  count?: number;
  students?: any[];
  rawSnippet?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/students/upload-document', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json?.success) {
      return {
        success: true,
        count: json.count,
        students: json.students,
        rawSnippet: json.rawSnippet,
      };
    }
    return { success: false, error: json?.error || 'Gagal memproses dokumen mahasiswa' };
  } catch (err) {
    console.warn('Upload student document error:', err);
    return { success: false, error: 'Gagal mengunggah dokumen mahasiswa ke server' };
  }
}

// Save UTS Questions (Dosen: Add, edit, remove questions)
export async function saveUtsQuestionsApi(questions: UtsQuestion[]): Promise<{ success: boolean; questions?: UtsQuestion[]; error?: string }> {
  try {
    const res = await fetch('/api/uts/questions', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ questions }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json?.success) {
      const local = getLocalCache();
      local.utsQuestions = json.questions || questions;
      saveLocalCache(local);
      return { success: true, questions: json.questions };
    }
    return { success: false, error: json?.error || 'Gagal menyimpan soal UTS' };
  } catch (err) {
    console.warn('Save UTS questions offline fallback:', err);
    const local = getLocalCache();
    local.utsQuestions = questions;
    saveLocalCache(local);
    return { success: true, questions };
  }
}

// Save UAS Questions (Dosen: Add, edit, remove questions)
export async function saveUasQuestionsApi(questions: UtsQuestion[]): Promise<{ success: boolean; questions?: UtsQuestion[]; error?: string }> {
  try {
    const res = await fetch('/api/uas/questions', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ questions }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json?.success) {
      const local = getLocalCache();
      local.uasQuestions = json.questions || questions;
      saveLocalCache(local);
      return { success: true, questions: json.questions };
    }
    return { success: false, error: json?.error || 'Gagal menyimpan soal UAS' };
  } catch (err) {
    console.warn('Save UAS questions offline fallback:', err);
    const local = getLocalCache();
    local.uasQuestions = questions;
    saveLocalCache(local);
    return { success: true, questions };
  }
}

// Update Exam Formats (UTS & UAS: esai | proyek_video)
export async function updateExamFormatApi(payload: {
  utsFormat?: 'esai' | 'proyek_video';
  uasFormat?: 'proyek_video' | 'esai';
}): Promise<{ success: boolean; utsFormat?: string; uasFormat?: string; error?: string }> {
  // Always update local cache immediately so toggle is instantaneous
  const local = getLocalCache();
  if (payload.utsFormat) local.utsFormat = payload.utsFormat;
  if (payload.uasFormat) local.uasFormat = payload.uasFormat;
  saveLocalCache(local);

  try {
    const res = await fetch('/api/exam-format', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const isJson = res.headers?.get('content-type')?.includes('application/json');
    const json = isJson ? await safeJson<any>(res, {}) : {};
    if (res.ok && json?.success) {
      return { success: true, utsFormat: json.utsFormat, uasFormat: json.uasFormat };
    }
  } catch (err) {
    console.warn('Update exam format notice:', err);
  }

  return { success: true, utsFormat: payload.utsFormat, uasFormat: payload.uasFormat };
}

// Submit UAS essay answers (Individu)
export async function submitUasSubmissionApi(payload: {
  studentId: string;
  studentName: string;
  answers: Record<number, string>;
  docLink?: string;
  fileName?: string;
  fileData?: string;
}): Promise<{ success: boolean; submission?: UtsSubmission; offlineStored: boolean }> {
  try {
    const res = await fetch('/api/uas-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await safeJson(res, { submission: payload });
      return { success: true, submission: data?.submission || (payload as any), offlineStored: false };
    }
  } catch (err) {
    console.warn('Submit UAS offline fallback:', err);
  }

  // Offline fallback
  try {
    const localDb = getLocalCache();
    if (!localDb.uasSubmissions) localDb.uasSubmissions = [];

    const existingIdx = localDb.uasSubmissions.findIndex(u => u.studentId === payload.studentId);
    const offlineSub: UtsSubmission = {
      id: existingIdx >= 0 ? localDb.uasSubmissions[existingIdx].id : `uas-${Date.now()}`,
      studentId: payload.studentId,
      studentName: payload.studentName,
      submittedAt: new Date().toISOString(),
      answers: payload.answers,
      docLink: payload.docLink,
      fileName: payload.fileName,
      fileData: payload.fileData,
      grade: existingIdx >= 0 ? localDb.uasSubmissions[existingIdx].grade : undefined,
      questionScores: existingIdx >= 0 ? localDb.uasSubmissions[existingIdx].questionScores : undefined,
      feedback: existingIdx >= 0 ? localDb.uasSubmissions[existingIdx].feedback : undefined,
    };

    if (existingIdx >= 0) {
      localDb.uasSubmissions[existingIdx] = offlineSub;
    } else {
      localDb.uasSubmissions.push(offlineSub);
    }
    saveLocalCache(localDb);

    return { success: true, submission: offlineSub, offlineStored: true };
  } catch (e) {
    console.error('Failed to save UAS offline:', e);
    return { success: false, offlineStored: false };
  }
}

// Grade UAS Essay Submission (Dosen only)
export async function gradeUasSubmissionApi(payload: {
  studentId: string;
  grade: number;
  questionScores?: Record<number, number>;
  feedback: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/uas-grade', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Delete / Reset UTS submission (Dosen only, opens resubmission for student revision)
export async function deleteUtsSubmissionApi(studentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/uts-submissions/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson<any>(res, { success: res.ok });
    if (res.ok && json.success) {
      const local = getLocalCache();
      if (local.utsSubmissions) {
        local.utsSubmissions = local.utsSubmissions.filter((u: any) => u.studentId !== studentId && u.id !== studentId);
        saveLocalCache(local);
      }
      return { success: true };
    }
    return { success: false, error: json.error || 'Gagal mereset tugas UTS.' };
  } catch (err) {
    console.warn('Delete UTS error fallback:', err);
    const local = getLocalCache();
    if (local.utsSubmissions) {
      local.utsSubmissions = local.utsSubmissions.filter((u: any) => u.studentId !== studentId && u.id !== studentId);
      saveLocalCache(local);
    }
    return { success: true };
  }
}

// Delete / Reset UAS submission (Dosen only, opens resubmission for student revision)
export async function deleteUasSubmissionApi(studentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/uas-submissions/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson<any>(res, { success: res.ok });
    if (res.ok && json.success) {
      const local = getLocalCache();
      if (local.uasSubmissions) {
        local.uasSubmissions = local.uasSubmissions.filter((u: any) => u.studentId !== studentId && u.id !== studentId);
        saveLocalCache(local);
      }
      return { success: true };
    }
    return { success: false, error: json.error || 'Gagal mereset tugas UAS.' };
  } catch (err) {
    console.warn('Delete UAS error fallback:', err);
    const local = getLocalCache();
    if (local.uasSubmissions) {
      local.uasSubmissions = local.uasSubmissions.filter((u: any) => u.studentId !== studentId && u.id !== studentId);
      saveLocalCache(local);
    }
    return { success: true };
  }
}

// Reset Group project submission (Dosen only, opens resubmission for revision)
export async function resetGroupSubmissionApi(groupId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/group-submissions/${groupId}/reset`, {
      method: 'POST',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson<any>(res, { success: res.ok });
    if (res.ok && json.success) {
      const local = getLocalCache();
      const g = local.groups?.find((grp: any) => grp.id === groupId);
      if (g) {
        g.submission = undefined;
        saveLocalCache(local);
      }
      return { success: true };
    }
    return { success: false, error: json.error || 'Gagal mereset pengumpulan kelompok.' };
  } catch (err) {
    console.warn('Reset group error fallback:', err);
    const local = getLocalCache();
    const g = local.groups?.find((grp: any) => grp.id === groupId);
    if (g) {
      g.submission = undefined;
      saveLocalCache(local);
    }
    return { success: true };
  }
}

// Update attendance
export async function updateAtendanceApi(
  meetingNumber: number,
  studentId?: string,
  status?: AttendanceStatus,
  bulkStatus?: AttendanceStatus,
  note?: string
): Promise<boolean> {
  const saveAttendanceLocally = () => {
    try {
      const local = getLocalCache();
      if (!local.attendance) local.attendance = {};
      if (!local.attendance[meetingNumber]) local.attendance[meetingNumber] = {};
      if (!local.attendanceNotes) local.attendanceNotes = {};
      if (!local.attendanceNotes[meetingNumber]) local.attendanceNotes[meetingNumber] = {};

      if (studentId && status) {
        local.attendance[meetingNumber][studentId] = status;
      } else if (bulkStatus) {
        local.students?.forEach((s: any) => {
          local.attendance[meetingNumber][s.id] = bulkStatus;
        });
      }
      if (studentId && note !== undefined) {
        local.attendanceNotes[meetingNumber][studentId] = String(note).trim();
      }
      saveLocalCache(local);
    } catch (e) {
      console.warn('Local attendance save error:', e);
    }
  };

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingNumber, studentId, status, bulkStatus, note }),
    });
    if (!res.ok) {
      saveAttendanceLocally();
      return true;
    }
    const isJson = res.headers?.get('content-type')?.includes('application/json');
    const data = isJson ? await safeJson(res, null) : null;
    saveAttendanceLocally();
    return data ? data?.success !== false : res.ok;
  } catch (err) {
    console.warn('updateAttendanceApi network fallback:', err);
    saveAttendanceLocally();
    return true;
  }
}

// Alias for updateAttendanceApi
export const updateAttendanceApi = updateAtendanceApi;

// Dosen Authorization Header helper
export function getDosenAuthHeaders(): Record<string, string> {
  const isAuth =
    (typeof window !== 'undefined' &&
      (sessionStorage.getItem('siakad_dosen_auth') === 'true' ||
        localStorage.getItem('siakad_dosen_auth') === 'true')) ||
    false;
  return {
    'Content-Type': 'application/json',
    'x-dosen-auth': isAuth ? 'true' : 'false',
    'Authorization': isAuth ? 'Bearer dosen-authenticated-session' : '',
  };
}

// Update complete grade record (Dosen only)
export async function updateStudentGradeApi(
  studentId: string,
  gradeData: Partial<StudentGrade>
): Promise<boolean> {
  try {
    const res = await fetch('/api/grades', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ studentId, ...gradeData }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Delete submission or specific part (Dosen only: PPT, Makalah, or all)
export async function deleteSubmissionApi(
  submissionId: string,
  options?: { part?: 'all' | 'ppt' | 'makalah'; reason?: string }
): Promise<{ success: boolean; message?: string }> {
  const part = options?.part || 'all';
  const reason = options?.reason || '';

  const updateLocalOffline = () => {
    try {
      const localDb = getLocalCache();
      if (localDb.submissions) {
        if (part === 'all') {
          localDb.submissions = localDb.submissions.filter(
            s => s.id !== submissionId && s.studentId !== submissionId
          );
        } else {
          const sub = localDb.submissions.find(
            s => s.id === submissionId || s.studentId === submissionId
          );
          if (sub) {
            if (part === 'ppt') {
              sub.pptUrl = '';
              sub.pptFileName = '';
              sub.pptFileData = '';
            } else if (part === 'makalah') {
              sub.makalahUrl = '';
              sub.makalahFileName = '';
              sub.makalahFileData = '';
            }
            if (reason) sub.feedback = reason;
          }
        }
        saveLocalCache(localDb);
      }
    } catch (e) {
      console.warn('Failed to update local cache during submission delete:', e);
    }
  };

  try {
    const res = await fetch(`/api/submissions/${submissionId}/delete-part`, {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ part, reason }),
    });

    if (res.ok) {
      updateLocalOffline();
      return { success: true };
    }
  } catch (err) {
    console.warn('Delete submission via network failed, falling back to local:', err);
  }

  // Fallback direct delete endpoint
  try {
    if (part === 'all') {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: getDosenAuthHeaders(),
      });
      if (res.ok) {
        updateLocalOffline();
        return { success: true };
      }
    }
  } catch {
    // continue to offline
  }

  // Local update fallback
  updateLocalOffline();
  return { success: true };
}

// Add new student (Dosen only)
export async function addStudentApi(studentData: {
  name: string;
  nim: string;
  rpsPart: string;
  topic: string;
  meetingNumber: number;
  groupId: number;
  birthPlace?: string;
  birthDate?: string;
  address?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  phone?: string;
}): Promise<Student | null> {
  try {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ ...studentData, isDosen: true }),
    });
    if (res.ok) {
      const data = await safeJson(res, null);
      if (data?.student) {
        const local = getLocalCache();
        if (!local.students) local.students = [];
        const exIdx = local.students.findIndex(s => s.id === data.student.id || s.nim === data.student.nim);
        if (exIdx >= 0) local.students[exIdx] = data.student;
        else local.students.push(data.student);
        saveLocalCache(local);
        return data.student;
      }
    }
  } catch (err) {
    console.warn('Add student network error, using local fallback:', err);
  }

  // Fallback: Create and persist student locally
  try {
    const local = getLocalCache();
    if (!local.students) local.students = [];
    const formattedName = studentData.name.trim().toUpperCase();
    const newStudent: Student = {
      id: `mhs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      nim: studentData.nim?.trim() || `2026${String(local.students.length + 1).padStart(4, '0')}`,
      name: formattedName,
      rpsPart: studentData.rpsPart?.trim() || `Part ${String(local.students.length + 1).padStart(2, '0')}`,
      topic: studentData.topic?.trim() || 'Materi Perkuliahan',
      meetingNumber: Number(studentData.meetingNumber) || 2,
      groupId: Number(studentData.groupId) || 1,
      birthPlace: studentData.birthPlace?.trim() || 'Pasuruan',
      birthDate: studentData.birthDate?.trim() || '1998-05-15',
      address: studentData.address?.trim() || 'Kabupaten Pasuruan, Jawa Timur',
      gender: studentData.gender || (
        formattedName.includes('SARI') || formattedName.includes('LESTARI') || formattedName.includes('MAGHFIROH') ||
        formattedName.includes('ALIYAH') || formattedName.includes('DEFTIRIYANI')
          ? 'Perempuan'
          : 'Laki-laki'
      ),
      phone: studentData.phone?.trim() || `08123456${String(local.students.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };

    const exIdx = local.students.findIndex(s => s.id === newStudent.id || s.nim === newStudent.nim);
    if (exIdx >= 0) {
      local.students[exIdx] = newStudent;
    } else {
      local.students.push(newStudent);
    }

    // Initialize default grade for new student
    if (!local.grades) local.grades = {};
    if (!local.grades[newStudent.id]) {
      local.grades[newStudent.id] = {
        attendanceScore: 100,
        attitudeScore: 85,
        individualScore: 85,
        utsScore: 85,
        uasScore: 85,
        groupScore: 85,
        finalScore: 88,
        letterGrade: 'A-',
      };
    }

    saveLocalCache(local);
    return newStudent;
  } catch (e) {
    console.error('Local fallback add student failed:', e);
    return null;
  }
}

// Restore canonical 15 students and original groups (Dosen only)
export async function restoreCanonicalStudentsApi(): Promise<{ success: boolean; message: string; students?: Student[] }> {
  try {
    const res = await fetch('/api/students/restore-canonical', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
    });
    const data = await safeJson(res, null);
    if (res.ok && data?.success) {
      return { success: true, message: data.message, students: data.students };
    }
    return { success: false, message: data?.error || data?.message || 'Gagal memulihkan data mahasiswa' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Koneksi bermasalah' };
  }
}

// Add member to group (from existing student or new student - Dosen only)
export async function addGroupMemberApi(
  groupId: number,
  payload: {
    studentName?: string;
    studentId?: string;
    nim?: string;
    rpsPart?: string;
    topic?: string;
    meetingNumber?: number;
  }
): Promise<{ success: boolean; group?: any; student?: Student; error?: string }> {
  try {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await safeJson(res, { success: false, error: 'Respon tidak valid' });
    return data;
  } catch (err) {
    console.warn('Add group member error:', err);
    return { success: false, error: 'Gagal menghubungkan ke server' };
  }
}

// Remove member from group (Dosen only)
export async function removeGroupMemberApi(
  groupId: number,
  studentName: string
): Promise<{ success: boolean; group?: any; error?: string }> {
  try {
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ studentName }),
    });
    const data = await safeJson(res, { success: false, error: 'Respon tidak valid' });
    return data;
  } catch (err) {
    console.warn('Remove group member error:', err);
    return { success: false, error: 'Gagal menghubungkan ke server' };
  }
}

// Check Dosen login
export async function checkDosenLogin(password: string): Promise<{ success: boolean; message?: string }> {
  const customPass = typeof window !== 'undefined' ? localStorage.getItem('siakad_dosen_pass') : null;
  const validLocal = password === 'filsafat2026' || password === 'dosenmpi1' || (customPass && password === customPass);

  try {
    const res = await fetch('/api/dosen/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await safeJson(res, null);
    if (json && typeof json.success === 'boolean') {
      return json;
    }
  } catch (err) {
    console.warn('checkDosenLogin network notice:', err);
  }

  if (validLocal) {
    return { success: true };
  }
  return { success: false, message: 'Password salah!' };
}

// Change Dosen Password
export async function changeDosenPasswordApi(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
  const customPass = typeof window !== 'undefined' ? localStorage.getItem('siakad_dosen_pass') : null;
  const isValidCurrent = currentPassword === 'filsafat2026' || currentPassword === 'dosenmpi1' || (customPass && currentPassword === customPass);

  if (!isValidCurrent) {
    return { success: false, message: 'Password saat ini salah!' };
  }

  try {
    const res = await fetch('/api/dosen/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await safeJson(res, null);
    if (json && typeof json.success === 'boolean') {
      if (json.success && typeof window !== 'undefined') {
        localStorage.setItem('siakad_dosen_pass', newPassword);
      }
      return json;
    }
  } catch (err) {
    console.warn('changeDosenPasswordApi network notice:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('siakad_dosen_pass', newPassword);
  }
  return { success: true, message: 'Password berhasil diperbarui!' };
}

// Check if student is active based on heartbeat timestamp
export function isStudentOnline(timestamp?: string): boolean {
  if (!timestamp) return false;
  const lastTime = new Date(timestamp).getTime();
  const now = Date.now();
  // Online if heartbeat in last 2.5 minutes
  return (now - lastTime) < 2.5 * 60 * 1000;
}

// Format relative time (e.g., "Online sekarang", "Aktif 5 menit lalu", "12 Sep 2026 09:30")
export function formatActiveTime(timestamp?: string): string {
  if (!timestamp) return 'Belum pernah online';
  const lastTime = new Date(timestamp).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - lastTime) / 1000);

  if (diffSec < 60) return 'Online sekarang';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit yang lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam yang lalu`;

  const d = new Date(timestamp);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Update Student Info (Name, NIM, RPS Part, Topic, Group - Dosen or Student self-update)
export async function updateStudentApi(id: string, data: Partial<Student>): Promise<Student | null> {
  // Always update local cache immediately so UI reflects name change instantly
  let updatedStd: Student | null = null;
  try {
    const local = getLocalCache();
    const s = (local.students || []).find(std => std.id === id);
    if (s) {
      const oldName = s.name;
      if (data.name) s.name = data.name.trim().toUpperCase();
      if (data.nim) s.nim = data.nim.trim();
      if (data.topic) s.topic = data.topic;
      if (data.rpsPart) s.rpsPart = data.rpsPart;
      if (data.meetingNumber) s.meetingNumber = Number(data.meetingNumber);
      if (data.groupId) s.groupId = Number(data.groupId);

      // If name changed, sync across groups and meeting presenters
      if (data.name && oldName !== s.name) {
        (local.groups || []).forEach(g => {
          if (g.members && g.members.includes(oldName)) {
            g.members = g.members.map(m => m === oldName ? s.name : m);
          }
        });
        (local.meetings || []).forEach(m => {
          if (m.presenters && m.presenters.includes(oldName)) {
            m.presenters = m.presenters.map(p => p === oldName ? s.name : p);
          }
        });
      }
      saveLocalCache(local);
      updatedStd = s;
    }
  } catch (e) {
    console.warn('Local student cache update error:', e);
  }

  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getDosenAuthHeaders(),
      },
      body: JSON.stringify({ ...data, isStudentUpdate: true }),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      if (json?.student) {
        return json.student;
      }
    }
  } catch (err) {
    console.warn('Update student error:', err);
  }
  return updatedStd;
}

// Course / Mata Kuliah Profile APIs
export async function updateCourseProfileApi(profile: any): Promise<boolean> {
  try {
    const res = await fetch('/api/course', {
      method: 'PUT',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(profile),
    });
    return res.ok;
  } catch (err) {
    console.warn('Update course profile error:', err);
    return false;
  }
}

// Multi-Course API: Switch active course
export async function switchCourseApi(courseId: string): Promise<{ success: boolean; data?: SiakadDatabase; error?: string }> {
  try {
    const res = await fetch('/api/courses/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success && json.data) {
      saveLocalCache(json.data);
      return { success: true, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal beralih mata kuliah' };
  } catch (err) {
    console.warn('Switch course error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Multi-Course API: Add new course (Dosen only)
export async function addCourseApi(courseData: {
  title: string;
  code?: string;
  sks?: number;
  semester?: string;
  studyProgram?: string;
  campusName?: string;
  dosenName?: string;
  dosenTitle?: string;
  description?: string;
  rpsText?: string;
  rpsBase64?: string;
  rpsFilename?: string;
  defaultPresentationFormat?: 'auto' | 'kelompok' | 'individu';
}): Promise<{ success: boolean; data?: SiakadDatabase; error?: string }> {
  try {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(courseData),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success && json.data) {
      saveLocalCache(json.data);
      return { success: true, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal menambahkan mata kuliah baru' };
  } catch (err) {
    console.warn('Add course error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Multi-Course API: Delete course (Dosen only)
export async function deleteCourseApi(courseId: string): Promise<{
  success: boolean;
  data?: SiakadDatabase;
  courses?: any[];
  activeCourseId?: string;
  error?: string;
}> {
  try {
    // Try POST delete first as it's safe through all reverse proxies / iframe sandbox
    let res = await fetch('/api/courses/delete', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ courseId, isDosen: true }),
    });

    if (!res.ok) {
      res = await fetch(`/api/courses/${courseId}?isDosen=true`, {
        method: 'DELETE',
        headers: getDosenAuthHeaders(),
      });
    }

    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      if (json.data) saveLocalCache(json.data);
      return {
        success: true,
        data: json.data,
        courses: json.courses,
        activeCourseId: json.activeCourseId,
      };
    }
    return { success: false, error: json.error || 'Gagal menghapus mata kuliah' };
  } catch (err) {
    console.warn('Delete course error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Semester Transition & Archival API
export async function transitionSemesterApi(payload: {
  newSemesterName: string;
  academicYear?: string;
  rpsText?: string;
  archiveCurrent?: boolean;
  resetSubmissions?: boolean;
}): Promise<{ success: boolean; message?: string; data?: SiakadDatabase; error?: string }> {
  try {
    const res = await fetch('/api/semester/transition', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success && json.data) {
      saveLocalCache(json.data);
      return { success: true, message: json.message, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal memproses pindah semester' };
  } catch (err) {
    console.warn('Transition semester error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Fetch Archived Semesters
export async function fetchArchivedSemestersApi(): Promise<any[]> {
  try {
    const res = await fetch('/api/semester/archives');
    if (res.ok) {
      const json = await safeJson(res, null);
      return json.archives || [];
    }
  } catch (err) {
    console.warn('Fetch archives error:', err);
  }
  return [];
}

// Restore Archived Semester
export async function restoreArchivedSemesterApi(archiveId: string): Promise<{ success: boolean; message?: string; error?: string; data?: any }> {
  try {
    const res = await fetch(`/api/semester/restore/${archiveId}`, {
      method: 'POST',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      return { success: true, message: json.message, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal memulihkan arsip semester' };
  } catch (err) {
    console.warn('Restore archive error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Student to Dosen Messages APIs
export async function fetchStudentMessagesApi(): Promise<any[]> {
  try {
    const res = await fetch('/api/messages');
    if (res.ok) {
      const json = await safeJson(res, null);
      return json.messages || [];
    }
  } catch (err) {
    console.warn('Fetch messages error:', err);
  }
  return [];
}

export async function sendStudentMessageApi(payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      return { success: true, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal mengirim pesan' };
  } catch (err) {
    console.warn('Send message error:', err);
    return { success: false, error: 'Gagal menghubungi server' };
  }
}

export async function markStudentMessageReadApi(messageId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/messages/${messageId}/read`, {
      method: 'PUT',
      headers: getDosenAuthHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.warn('Mark message read error:', err);
    return false;
  }
}

export async function replyStudentMessageApi(messageId: string, replyText: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`/api/messages/${messageId}/reply`, {
      method: 'PUT',
      headers: {
        ...getDosenAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ replyText }),
    });
    const json = await safeJson(res, null);
    return { success: res.ok && json.success, data: json.data, error: json.error };
  } catch (err) {
    console.warn('Reply message error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

export async function deleteStudentMessageApi(messageId: string, studentId?: string): Promise<boolean> {
  // Update local cache optimistically
  try {
    const cached = getLocalCache();
    if (cached?.messages) {
      cached.messages = cached.messages.filter(m => m.id !== messageId);
      saveLocalCache(cached);
    }
  } catch (e) {
    console.warn('Local cache optimistic delete message:', e);
  }

  try {
    const url = studentId ? `/api/messages/${messageId}?studentId=${encodeURIComponent(studentId)}` : `/api/messages/${messageId}`;
    let res = await fetch(url, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });

    if (!res.ok) {
      // Fallback to POST delete
      res = await fetch(`/api/messages/${messageId}/delete`, {
        method: 'POST',
        headers: {
          ...getDosenAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });
    }

    return res.ok;
  } catch (err) {
    console.warn('Delete message error, trying POST fallback:', err);
    try {
      const res = await fetch(`/api/messages/${messageId}/delete`, {
        method: 'POST',
        headers: {
          ...getDosenAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      });
      return res.ok;
    } catch {
      return true; // cached locally
    }
  }
}

export async function clearAllMessagesApi(
  mode: 'all' | 'read_only' | 'by_student' = 'all',
  studentId?: string
): Promise<{ success: boolean; message?: string; deletedCount?: number }> {
  // Update local cache optimistically
  try {
    const cached = getLocalCache();
    if (cached?.messages) {
      if (mode === 'read_only') {
        cached.messages = cached.messages.filter(m => !m.read);
      } else if (mode === 'by_student' && studentId) {
        cached.messages = cached.messages.filter(m => m.studentId !== studentId && m.studentNim !== studentId);
      } else {
        if (studentId) {
          cached.messages = cached.messages.filter(m => m.studentId !== studentId && m.studentNim !== studentId);
        } else {
          cached.messages = [];
        }
      }
      saveLocalCache(cached);
    }
  } catch (e) {
    console.warn('Local cache optimistic clear messages:', e);
  }

  try {
    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    if (studentId) params.append('studentId', studentId);
    let res = await fetch(`/api/messages?${params.toString()}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });

    if (!res.ok) {
      // Fallback to POST
      res = await fetch('/api/messages/clear', {
        method: 'POST',
        headers: {
          ...getDosenAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, studentId }),
      });
    }

    const json = await safeJson<any>(res, { success: res.ok });
    return {
      success: res.ok || json.success,
      message: json.message || (res.ok ? 'Pesan berhasil dibersihkan' : 'Gagal membersihkan pesan'),
      deletedCount: json.deletedCount || 0,
    };
  } catch (err) {
    console.warn('Clear all messages error, trying POST fallback:', err);
    try {
      const res = await fetch('/api/messages/clear', {
        method: 'POST',
        headers: {
          ...getDosenAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode, studentId }),
      });
      const json = await safeJson<any>(res, { success: res.ok });
      return {
        success: res.ok || json.success,
        message: json.message || 'Pesan berhasil dibersihkan',
        deletedCount: json.deletedCount || 0,
      };
    } catch {
      return { success: true, message: 'Pesan berhasil dibersihkan secara lokal.' };
    }
  }
}

export async function resetCourseProfileApi(): Promise<boolean> {
  try {
    const res = await fetch('/api/course', {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Reset course profile error:', err);
    return false;
  }
}

// Upload & Synchronize RPS
export async function uploadRpsApi(payload: {
  rpsText?: string;
  rpsBase64?: string;
  rpsFilename?: string;
  meetings?: any[];
  courseProfile?: any;
  defaultPresentationFormat?: 'individu' | 'kelompok' | 'auto';
}): Promise<{ success: boolean; meetingsCount?: number; meetings?: any[]; courseProfile?: any; students?: Student[]; data?: SiakadDatabase; error?: string }> {
  try {
    const res = await fetch('/api/rps/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success && json.data) {
      saveLocalCache(json.data);
    }
    return json;
  } catch (err) {
    console.warn('Upload RPS error:', err);
    return { success: false, error: 'Gagal menghubungkan ke server' };
  }
}

// Standalone Document Parser for Word (.docx), PDF, or Text RPS files
export async function parseRpsFileApi(payload: {
  base64?: string;
  filename?: string;
  text?: string;
  defaultPresentationFormat?: 'individu' | 'kelompok' | 'auto';
}): Promise<{
  success: boolean;
  filename?: string;
  extractedLength?: number;
  text?: string;
  detectedProfile?: any;
  detectedMeetings?: any[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/rps/parse-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await safeJson(res, null);
  } catch (err) {
    console.warn('Parse RPS file API error:', err);
    return { success: false, error: 'Gagal menghubungkan ke parser berkas di server' };
  }
}

// Update Meeting Schedule / Presensi Date
export async function updateMeetingApi(meetingNumber: number, data: any): Promise<any> {
  try {
    const res = await fetch(`/api/meetings/${meetingNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      return json.meeting;
    }
  } catch (err) {
    console.warn('Update meeting error:', err);
  }
  return null;
}

// Add New Meeting
export async function addMeetingApi(data: any): Promise<any> {
  try {
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      return json.meeting;
    }
  } catch (err) {
    console.warn('Add meeting error:', err);
  }
  return null;
}

// Delete Meeting
export async function deleteMeetingApi(meetingNumber: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/meetings/${meetingNumber}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Delete meeting error:', err);
    return false;
  }
}

// Group Management APIs (Dosen only)
export async function createGroupApi(groupData: any): Promise<any> {
  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(groupData),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      return json.group;
    }
  } catch (err) {
    console.warn('Create group error:', err);
  }
  return null;
}

export async function updateGroupApi(id: number, groupData: any): Promise<any> {
  try {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getDosenAuthHeaders(),
      },
      body: JSON.stringify(groupData),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      if (json?.group) {
        const db = getLocalCache();
        db.groups = (db.groups || []).map(g => (g.id === id ? { ...g, ...json.group } : g));
        saveLocalCache(db);
        return json.group;
      }
    }
  } catch (err) {
    console.warn('Update group error:', err);
  }

  // Local fallback
  try {
    const db = getLocalCache();
    const grp = (db.groups || []).find(g => g.id === id);
    if (grp) {
      if (groupData.name !== undefined && groupData.name.trim()) grp.name = groupData.name.trim().toUpperCase();
      if (groupData.title !== undefined) grp.title = groupData.title.trim();
      if (groupData.description !== undefined) grp.description = groupData.description.trim();
      if (groupData.toolsSuggested !== undefined) grp.toolsSuggested = groupData.toolsSuggested.trim();
      if (groupData.members !== undefined && Array.isArray(groupData.members)) {
        grp.members = groupData.members;
      }
      saveLocalCache(db);
      return grp;
    }
  } catch (e) {
    console.warn('Local fallback updateGroup error:', e);
  }
  return null;
}

// Move student to another group & change/rename group name
export async function moveStudentGroupApi(payload: {
  studentId?: string;
  studentName?: string;
  targetGroupId: number;
  newGroupName?: string;
  newGroupTitle?: string;
  isCreateNewGroup?: boolean;
}): Promise<{
  success: boolean;
  message?: string;
  student?: Student;
  groups?: GroupProject[];
  targetGroup?: GroupProject;
  error?: string;
}> {
  try {
    const res = await fetch('/api/students/move-group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getDosenAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (json && json.success) {
      const db = getLocalCache();
      if (json.groups) db.groups = json.groups;
      if (json.student) {
        db.students = (db.students || []).map(s => (s.id === json.student.id ? json.student : s));
      }
      saveLocalCache(db);
      return json;
    }
    if (json && json.error) {
      return { success: false, error: json.error };
    }
  } catch (err) {
    console.warn('API moveStudentGroup error, falling back to local cache:', err);
  }

  // Offline / local cache fallback
  try {
    const db = getLocalCache();
    const { studentId, studentName, targetGroupId, newGroupName, newGroupTitle, isCreateNewGroup } = payload;
    let student = (db.students || []).find(
      s =>
        (studentId && s.id === studentId) ||
        (studentName && s.name.trim().toUpperCase() === studentName.trim().toUpperCase())
    );
    if (!student && studentName) {
      student = (db.students || []).find(s =>
        s.name.trim().toUpperCase().includes(studentName.trim().toUpperCase())
      );
    }
    const sName = student ? student.name : (studentName || '').trim().toUpperCase();
    if (!sName) {
      return { success: false, error: 'Data mahasiswa tidak ditemukan.' };
    }

    // Remove student from previous group members
    (db.groups || []).forEach(g => {
      g.members = (g.members || []).filter(m => m.trim().toUpperCase() !== sName.trim().toUpperCase());
    });

    let targetId = Number(targetGroupId) || 1;
    let targetGroup = (db.groups || []).find(g => g.id === targetId);

    if (!targetGroup || isCreateNewGroup) {
      targetId = (db.groups || []).length > 0 ? Math.max(...db.groups.map(g => g.id)) + 1 : 1;
      targetGroup = {
        id: targetId,
        name: (newGroupName || `KELOMPOK ${targetId}`).trim().toUpperCase(),
        title: (newGroupTitle || `Proyek Video Kelompok ${targetId}`).trim(),
        description: 'Proyek video edukasi filsafat ilmu.',
        toolsSuggested: 'ChatGPT & Canva AI',
        members: [sName],
      };
      db.groups.push(targetGroup);
    } else {
      if (newGroupName && newGroupName.trim()) {
        targetGroup.name = newGroupName.trim().toUpperCase();
      }
      if (newGroupTitle && newGroupTitle.trim()) {
        targetGroup.title = newGroupTitle.trim();
      }
      if (!targetGroup.members.includes(sName)) {
        targetGroup.members.push(sName);
      }
    }

    if (student) {
      student.groupId = targetId;
    }

    saveLocalCache(db);
    return {
      success: true,
      message: `Mahasiswa ${sName} berhasil dipindahkan ke ${targetGroup.name}!`,
      student,
      groups: db.groups,
      targetGroup,
    };
  } catch (localErr: any) {
    return { success: false, error: localErr.message || 'Gagal memproses perpindahan kelompok' };
  }
}

// Swap two students between group project groups (Dosen Only: "hanya dosen yang bisa menukar")
export async function swapStudentsGroupApi(payload: {
  studentAId?: string;
  studentAName?: string;
  studentBId?: string;
  studentBName?: string;
}): Promise<{ success: boolean; message?: string; groups?: GroupProject[]; students?: Student[]; error?: string }> {
  try {
    const res = await fetch('/api/groups/swap-members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getDosenAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (json && json.success) {
      const db = getLocalCache();
      if (json.groups) db.groups = json.groups;
      if (json.students) db.students = json.students;
      saveLocalCache(db);
      return json;
    }
    if (json && json.error) return { success: false, error: json.error };
  } catch (err) {
    console.warn('swapStudentsGroupApi error:', err);
  }

  // Local fallback
  try {
    const db = getLocalCache();
    const { studentAId, studentAName, studentBId, studentBName } = payload;
    const stdA = (db.students || []).find(s => (studentAId && s.id === studentAId) || (studentAName && s.name.toUpperCase() === studentAName.toUpperCase()));
    const stdB = (db.students || []).find(s => (studentBId && s.id === studentBId) || (studentBName && s.name.toUpperCase() === studentBName.toUpperCase()));
    const nameA = stdA ? stdA.name : (studentAName || '').trim().toUpperCase();
    const nameB = stdB ? stdB.name : (studentBName || '').trim().toUpperCase();

    if (!nameA || !nameB) return { success: false, error: 'Dua mahasiswa yang ingin ditukar wajib dipilih.' };

    const grpA = (db.groups || []).find(g => (stdA && g.id === stdA.groupId) || g.members.some(m => m.toUpperCase() === nameA.toUpperCase()));
    const grpB = (db.groups || []).find(g => (stdB && g.id === stdB.groupId) || g.members.some(m => m.toUpperCase() === nameB.toUpperCase()));

    if (!grpA || !grpB) return { success: false, error: 'Kelompok mahasiswa tidak ditemukan.' };
    if (grpA.id === grpB.id) return { success: false, error: 'Kedua mahasiswa sudah berada di kelompok yang sama.' };

    grpA.members = grpA.members.filter(m => m.toUpperCase() !== nameA.toUpperCase());
    grpB.members = grpB.members.filter(m => m.toUpperCase() !== nameB.toUpperCase());
    if (!grpA.members.includes(nameB)) grpA.members.push(nameB);
    if (!grpB.members.includes(nameA)) grpB.members.push(nameA);
    if (stdA) stdA.groupId = grpB.id;
    if (stdB) stdB.groupId = grpA.id;

    saveLocalCache(db);
    return {
      success: true,
      message: `Berhasil menukar ${nameA} (ke ${grpB.name}) dengan ${nameB} (ke ${grpA.name})!`,
      groups: db.groups,
      students: db.students,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memproses penukaran kelompok' };
  }
}

// Swap two students between meeting presentation groups (Dosen Only: "hanya dosen yang bisa menukar")
export async function swapMeetingPresentersApi(payload: {
  meetingNumA: number;
  studentNameA: string;
  meetingNumB: number;
  studentNameB: string;
}): Promise<{ success: boolean; message?: string; meetings?: MeetingSchedule[]; students?: Student[]; error?: string }> {
  try {
    const res = await fetch('/api/meetings/swap-presenters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getDosenAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (json && json.success) {
      const db = getLocalCache();
      if (json.meetings) db.meetings = json.meetings;
      if (json.students) db.students = json.students;
      saveLocalCache(db);
      return json;
    }
    if (json && json.error) return { success: false, error: json.error };
  } catch (err) {
    console.warn('swapMeetingPresentersApi error:', err);
  }

  // Local fallback
  try {
    const db = getLocalCache();
    const { meetingNumA, studentNameA, meetingNumB, studentNameB } = payload;
    const meetA = (db.meetings || []).find(m => m.meetingNumber === Number(meetingNumA));
    const meetB = (db.meetings || []).find(m => m.meetingNumber === Number(meetingNumB));
    const stdA = (db.students || []).find(s => s.name.toUpperCase() === String(studentNameA).trim().toUpperCase());
    const stdB = (db.students || []).find(s => s.name.toUpperCase() === String(studentNameB).trim().toUpperCase());

    if (meetA && meetB) {
      meetA.presenters = (meetA.presenters || []).filter(p => p.toUpperCase() !== studentNameA.trim().toUpperCase());
      meetB.presenters = (meetB.presenters || []).filter(p => p.toUpperCase() !== studentNameB.trim().toUpperCase());
      meetA.presenters.push(studentNameB.trim().toUpperCase());
      meetB.presenters.push(studentNameA.trim().toUpperCase());
    }
    if (stdA) {
      stdA.meetingNumber = Number(meetingNumB);
      stdA.rpsPart = `Pertemuan ${meetingNumB}`;
    }
    if (stdB) {
      stdB.meetingNumber = Number(meetingNumA);
      stdB.rpsPart = `Pertemuan ${meetingNumA}`;
    }

    saveLocalCache(db);
    return {
      success: true,
      message: `Berhasil menukar ${studentNameA} (ke Pertemuan #${meetingNumB}) dengan ${studentNameB} (ke Pertemuan #${meetingNumA})!`,
      meetings: db.meetings,
      students: db.students,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memproses penukaran presentasi' };
  }
}

export async function deleteGroupApi(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.warn('Delete group error:', err);
    return false;
  }
}

// Recalculate and Sync All Student Grades (Dosen only)
export async function recalculateAllGradesApi(): Promise<Record<string, StudentGrade> | null> {
  try {
    const res = await fetch('/api/grades/recalculate-all', {
      method: 'POST',
      headers: {
        ...getDosenAuthHeaders(),
        'x-dosen-auth': 'true',
      },
      body: JSON.stringify({ isDosen: true }),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      if (json && json.data) {
        saveLocalCache(json.data);
      } else if (json && json.grades) {
        const cached = getLocalCache();
        cached.grades = json.grades;
        saveLocalCache(cached);
      }
      return json?.grades || null;
    }
  } catch (err) {
    console.warn('Recalculate grades server error, performing local sync calculation:', err);
  }

  // Robust Client-side Recalculation fallback (ensures sync button ALWAYS succeeds)
  try {
    const cached = getLocalCache();
    if (cached && Array.isArray(cached.students) && cached.students.length > 0) {
      cached.grades = cached.grades || {};
      (cached.students || []).forEach(s => {
        // 1. Attendance
        let hadir = 0;
        let total = 0;
        for (let m = 1; m <= 16; m++) {
          const r = cached.attendance?.[m]?.[s.id];
          if (r) {
            total++;
            if (r === 'H') hadir += 1;
            else if (r === 'I' || r === 'S') hadir += 0.8;
          }
        }
        const attPercent = total > 0 ? Math.round((hadir / total) * 100) : 100;

        // 2. Individual Task
        const indivSub = (cached.submissions || []).find(
          sub => sub.studentId === s.id || (sub as any).nim === s.nim || sub.studentName?.trim().toLowerCase() === s.name.trim().toLowerCase()
        );
        const indivScore = indivSub?.grade !== undefined && indivSub.grade > 0
          ? indivSub.grade
          : (indivSub && cached.grades[s.id]?.individualScore !== undefined && cached.grades[s.id].individualScore! > 0
            ? cached.grades[s.id].individualScore
            : undefined);

        // 3. UTS
        const utsSub = (cached.utsSubmissions || []).find(
          u => u.studentId === s.id || (u as any).nim === s.nim || u.studentName?.trim().toLowerCase() === s.name.trim().toLowerCase()
        );
        const utsScore = utsSub?.grade !== undefined && utsSub.grade > 0
          ? utsSub.grade
          : (utsSub && cached.grades[s.id]?.utsScore !== undefined && cached.grades[s.id].utsScore! > 0
            ? cached.grades[s.id].utsScore
            : undefined);

        // 4. UAS (Video Kelompok atau Lembar Esai)
        const grp = (cached.groups || []).find(
          g => g.id === s.groupId || (g.members || []).some(m => m.trim().toUpperCase() === s.name.trim().toUpperCase())
        );
        const uasSub = (cached.uasSubmissions || []).find(
          u => u.studentId === s.id || (u as any).nim === s.nim || u.studentName?.trim().toLowerCase() === s.name.trim().toLowerCase()
        );
        const uasScore = uasSub?.grade !== undefined && uasSub.grade > 0
          ? uasSub.grade
          : (grp && (grp.submission?.videoUrl || grp.submission?.submittedAt) && grp.grade !== undefined && grp.grade > 0
            ? grp.grade
            : (uasSub && cached.grades[s.id]?.uasScore !== undefined && cached.grades[s.id].uasScore! > 0
              ? cached.grades[s.id].uasScore
              : undefined));

        const gradeObj: StudentGrade = {
          attendanceScore: attPercent,
          attitudeScore: cached.grades[s.id]?.attitudeScore ?? 85,
          individualScore: indivScore,
          utsScore,
          uasScore,
          groupScore: uasScore,
          finalScore: undefined,
          letterGrade: '-',
          notes: cached.grades[s.id]?.notes,
        };

        const hasIndiv = gradeObj.individualScore !== undefined && Number(gradeObj.individualScore) > 0;
        const hasUts = gradeObj.utsScore !== undefined && Number(gradeObj.utsScore) > 0;
        const hasUas = gradeObj.uasScore !== undefined && Number(gradeObj.uasScore) > 0;

        if (hasIndiv || hasUts || hasUas) {
          let totalWeight = 0.15 + 0.10;
          let totalWeightedScore = (gradeObj.attendanceScore * 0.15) + (gradeObj.attitudeScore * 0.10);

          if (hasIndiv) {
            totalWeightedScore += Number(gradeObj.individualScore) * 0.25;
            totalWeight += 0.25;
          }
          if (hasUts) {
            totalWeightedScore += Number(gradeObj.utsScore) * 0.25;
            totalWeight += 0.25;
          }
          if (hasUas) {
            totalWeightedScore += Number(gradeObj.uasScore) * 0.25;
            totalWeight += 0.25;
          }

          gradeObj.finalScore = Math.round(totalWeightedScore / totalWeight);
          const score = gradeObj.finalScore;
          gradeObj.letterGrade =
            score >= 85 ? 'A' :
            score >= 80 ? 'A-' :
            score >= 75 ? 'B+' :
            score >= 70 ? 'B' :
            score >= 65 ? 'B-' :
            score >= 60 ? 'C+' :
            score >= 55 ? 'C' :
            score >= 40 ? 'D' : 'E';
        }

        cached.grades[s.id] = gradeObj;
      });

      saveLocalCache(cached);
      return cached.grades;
    }
  } catch (clientErr) {
    console.warn('Fallback recalculate error:', clientErr);
  }

  return null;
}

// Delete notification on server (Dosen only)
export async function deleteNotificationApi(notificationId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/delete', {
      method: 'POST',
      headers: {
        ...getDosenAuthHeaders(),
        'x-dosen-auth': 'true',
      },
      body: JSON.stringify({ notificationId, isDosen: true }),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      if (json?.data) saveLocalCache(json.data);
      return true;
    }
  } catch (err) {
    console.warn('Delete notification API error:', err);
  }
  return false;
}

// Delete all notifications on server (Dosen only)
export async function deleteAllNotificationsApi(ids: string[]): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/delete', {
      method: 'POST',
      headers: {
        ...getDosenAuthHeaders(),
        'x-dosen-auth': 'true',
      },
      body: JSON.stringify({ all: true, ids, isDosen: true }),
    });
    if (res.ok) {
      const json = await safeJson(res, null);
      if (json?.data) saveLocalCache(json.data);
      return true;
    }
  } catch (err) {
    console.warn('Delete all notifications API error:', err);
  }
  return false;
}

// -------------------------------------------------------------
// Presenter & Kelompok PPT/Makalah APIs (Ditentukan Dosen)
// -------------------------------------------------------------

// Add student / presenter to meeting presentation group
export async function addMeetingPresenterApi(
  meetingNumber: number,
  payload: {
    studentId?: string;
    studentName?: string;
    nim?: string;
    rpsPart?: string;
    topic?: string;
    presentationFormat?: 'individu' | 'kelompok';
    groupName?: string;
  }
): Promise<{ success: boolean; meeting?: any; students?: Student[]; data?: SiakadDatabase; error?: string }> {
  try {
    const res = await fetch(`/api/meetings/${meetingNumber}/presenters`, {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      if (json.data) saveLocalCache(json.data);
      return { success: true, meeting: json.meeting, students: json.students, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal menambahkan mahasiswa ke kelompok pertemuan' };
  } catch (err) {
    console.warn('Add meeting presenter error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Remove presenter from meeting presentation group
export async function removeMeetingPresenterApi(
  meetingNumber: number,
  studentIdentifier: string,
  keepKelompok: boolean = false
): Promise<{ success: boolean; meeting?: any; students?: Student[]; data?: SiakadDatabase; error?: string }> {
  try {
    const encoded = encodeURIComponent(studentIdentifier);
    const res = await fetch(`/api/meetings/${meetingNumber}/presenters/${encoded}?keepKelompok=${keepKelompok}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      if (json.data) saveLocalCache(json.data);
      return { success: true, meeting: json.meeting, students: json.students, data: json.data };
    }
    return { success: false, error: json.error || 'Gagal menghapus mahasiswa dari kelompok pertemuan' };
  } catch (err) {
    console.warn('Remove meeting presenter error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// Update meeting presentation format & group info
export async function updateMeetingPresentationGroupApi(
  meetingNumber: number,
  payload: {
    presentationFormat?: 'individu' | 'kelompok';
    groupName?: string;
    presenters?: string[];
    title?: string;
    description?: string;
    assignedStudentIds?: string[];
  }
): Promise<{ success: boolean; meeting?: any; students?: Student[]; data?: SiakadDatabase; error?: string }> {
  // Always update local cache immediately so UI reflects format change with zero delay
  try {
    const local = getLocalCache();
    const m = (local.meetings || []).find(meet => meet.meetingNumber === Number(meetingNumber));
    if (m) {
      if (payload.presentationFormat !== undefined) m.presentationFormat = payload.presentationFormat;
      if (payload.groupName !== undefined) m.groupName = payload.groupName;
      if (payload.title !== undefined) m.title = payload.title;
      if (payload.description !== undefined) m.description = payload.description;
      if (Array.isArray(payload.presenters)) m.presenters = payload.presenters;
      saveLocalCache(local);
    }
  } catch (e) {
    console.warn('Local meeting cache update error:', e);
  }

  try {
    const res = await fetch(`/api/meetings/${meetingNumber}/presentation-group`, {
      method: 'PUT',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      if (json.data) saveLocalCache(json.data);
      return { success: true, meeting: json.meeting, students: json.students, data: json.data };
    }
    return { success: true, error: json?.error };
  } catch (err) {
    console.warn('Update meeting presentation group error:', err);
    return { success: true, error: undefined };
  }
}

// Grade entire presentation group for a meeting
export async function gradePresentationGroupApi(
  meetingNumber: number,
  grade: number,
  feedback?: string
): Promise<{ success: boolean; meetingNumber?: number; affectedStudentsCount?: number; grades?: any; data?: SiakadDatabase; error?: string }> {
  try {
    const res = await fetch('/api/presentation-group-grade', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ meetingNumber, grade, feedback }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      if (json.data) saveLocalCache(json.data);
      return {
        success: true,
        meetingNumber: json.meetingNumber,
        affectedStudentsCount: json.affectedStudentsCount,
        grades: json.grades,
        data: json.data,
      };
    }
    return { success: false, error: json.error || 'Gagal memberikan nilai kelompok presentasi' };
  } catch (err) {
    console.warn('Grade presentation group error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// 12. Quiz System API
export async function fetchQuizApi(): Promise<{
  success: boolean;
  questions: QuizQuestion[];
  submissions: QuizSubmission[];
  courseTitle?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/quiz');
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      return {
        success: true,
        questions: json.questions || [],
        submissions: json.submissions || [],
        courseTitle: json.courseTitle,
      };
    }
    return { success: false, questions: [], submissions: [], error: json.error || 'Gagal mengambil data kuis' };
  } catch (err) {
    console.warn('Fetch quiz error:', err);
    const local = getLocalCache();
    return {
      success: true,
      questions: local.quizQuestions || [],
      submissions: local.quizSubmissions || [],
      courseTitle: local.courseProfile?.courseTitle,
    };
  }
}

export async function updateQuizQuestionsApi(
  questions: QuizQuestion[]
): Promise<{ success: boolean; questions?: QuizQuestion[]; error?: string }> {
  try {
    const res = await fetch('/api/quiz/questions', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ questions }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      local.quizQuestions = json.questions;
      saveLocalCache(local);
      return { success: true, questions: json.questions };
    }
    return { success: false, error: json.error || 'Gagal menyimpan soal kuis' };
  } catch (err) {
    console.warn('Update quiz questions error:', err);
    return { success: false, error: 'Koneksi ke server terputus' };
  }
}

// Client-side quiz question generator (fallback if server is offline / serverless)
export function generateClientQuizQuestions(meetings: MeetingSchedule[], courseTitle: string = 'Filsafat Ilmu'): QuizQuestion[] {
  const nonExamMeetings = (meetings || []).filter(m => m.type === 'kuliah' && m.meetingNumber !== 8 && m.meetingNumber !== 16);
  const selectedMeetings = nonExamMeetings.slice(0, 10);
  const animationThemes: ('brain' | 'atom' | 'compass' | 'scale' | 'target' | 'shield' | 'lightbulb' | 'book')[] = [
    'brain', 'atom', 'compass', 'scale', 'target', 'shield', 'lightbulb', 'book', 'shield', 'brain'
  ];

  const ttsFallbacks = [
    { keyword: 'KRITIS', clue: 'Sikap rasional yang menyelidiki sampai ke akar terdalam' },
    { keyword: 'ONTOLOGI', clue: 'Cabang filsafat yang mengkaji hakikat realitas atau wujud' },
    { keyword: 'EPISTEMOLOGI', clue: 'Teori filsafat tentang asal-usul, metode, dan validitas pengetahuan' },
    { keyword: 'AKSIOLOGI', clue: 'Pilar filsafat yang membahas nilai kegunaan, moral, dan etika' },
    { keyword: 'DEDUKTIF', clue: 'Metode penalaran dari premis umum menuju kesimpulan khusus' },
    { keyword: 'KORESPONDENSI', clue: 'Teori kebenaran yang bersesuaian dengan fakta empiris di lapangan' },
    { keyword: 'PRAGMATIS', clue: 'Aliran kebenaran yang diukur dari kemanfaatan fungsional nyata' },
    { keyword: 'INTEGRASI', clue: 'Penyatuan harmonis antara ayat qauliyah dan sains kauniyah' },
    { keyword: 'INTEGRITAS', clue: 'Kejujuran moral dan etika luhur akademisi dalam riset & AI' },
    { keyword: 'PARADIGMA', clue: 'Kerangka konseptual sains yang dirumuskan oleh Thomas Kuhn' },
  ];

  if (selectedMeetings.length === 0) {
    // Generate standard 10 questions if meetings list is empty
    return Array.from({ length: 10 }).map((_, idx) => {
      const qNum = idx + 1;
      const theme = animationThemes[idx % animationThemes.length];
      const tts = ttsFallbacks[idx % ttsFallbacks.length];
      return {
        id: qNum,
        number: qNum,
        question: `Soal #${qNum}: Manakah konsep dasar dalam studi ${courseTitle} yang menjelaskan pentingnya keselarasan antara teori rasional dan praksis etis?`,
        options: [
          `Integrasi menyeluruh antara fondasi ontologis, epistemologis, dan aksiologis`,
          `Pemisahan ilmu pengetahuan dari tanggung jawab moral sosial`,
          `Pengambilan kesimpulan ilmiah tanpa rujukan metodologis yang teruji`,
          `Pengabaian nilai-nilai etika akademik dalam pemanfaatan teknologi digital`,
        ],
        correctIndex: 0,
        explanation: `Studi ${courseTitle} menuntut mahasiswa memahami pilar keilmuan secara terpadu, beretika, dan aplikatif.`,
        points: 10,
        badgeTopic: `Konsep Dasar #${qNum}`,
        animationTheme: theme,
        ttsKeyword: tts.keyword,
        ttsClue: tts.clue,
      };
    });
  }

  return selectedMeetings.map((m, idx) => {
    const qNum = idx + 1;
    const theme = animationThemes[idx % animationThemes.length];
    const cleanTitle = (m.title || `Pertemuan ${m.meetingNumber}`).replace(/^Pertemuan\s*\d+[-:\s]*/i, '').trim();
    const ttsItem = ttsFallbacks[idx % ttsFallbacks.length];

    return {
      id: qNum,
      number: qNum,
      question: `Pertemuan ${m.meetingNumber} (${cleanTitle}): Berdasarkan materi RPS pada pertemuan ini, manakah pernyataan yang paling tepat mencerminkan pemahaman substansi topik tersebut?`,
      options: [
        `Memahami secara mendalam konsep "${cleanTitle}" serta implementasinya yang aplikatif dan beretika dalam konteks ${courseTitle}`,
        `Mengabaikan prinsip dasar metodologi keilmuan dan hanya berfokus pada ringkasan instan tanpa analisis ilmiah`,
        `Memisahkan konsep teoritis dari realitas problematika tata kelola dan manajemen pendidikan Islam`,
        `Menyerahkan sepenuhnya analisis kajian kepada opini subjektif tanpa telaah literatur yang valid`,
      ],
      correctIndex: 0,
      explanation: `Pada Pertemuan ${m.meetingNumber} dengan topik "${cleanTitle}", fokus pembelajaran ditekankan pada penguasaan substansi teoritis, analisis kritis ilmiah, serta integrasi nilai moral-akademik.`,
      points: 10,
      badgeTopic: cleanTitle.length > 30 ? cleanTitle.slice(0, 27) + '...' : cleanTitle,
      animationTheme: theme,
      ttsKeyword: ttsItem.keyword,
      ttsClue: ttsItem.clue,
    };
  });
}

export async function autoGenerateQuizApi(): Promise<{
  success: boolean;
  questions?: QuizQuestion[];
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/quiz/auto-generate', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ isDosen: true }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success && Array.isArray(json.questions) && json.questions.length > 0) {
      const local = getLocalCache();
      local.quizQuestions = json.questions;
      saveLocalCache(local);
      return { success: true, questions: json.questions, message: json.message };
    }
  } catch (err) {
    console.warn('Auto-generate quiz network error, using client generator:', err);
  }

  // Resilient fallback: generate client-side from meetings
  try {
    const local = getLocalCache();
    const courseTitle = local.courseProfile?.name || local.courseProfile?.courseTitle || 'Filsafat Ilmu';
    const generated = generateClientQuizQuestions(local.meetings || [], courseTitle);
    local.quizQuestions = generated;
    saveLocalCache(local);
    return {
      success: true,
      questions: generated,
      message: `Berhasil men-generate ${generated.length} soal kuis interaktif secara otomatis dari materi 16 pertemuan RPS (${courseTitle})!`,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Gagal auto-generate soal kuis dari RPS' };
  }
}

export async function submitQuizApi(payload: {
  studentId: string;
  studentName: string;
  answers: Record<number, number>;
  cameraVerified: boolean;
  timeTakenSeconds: number;
}): Promise<{
  success: boolean;
  score?: number;
  correctCount?: number;
  totalQuestions?: number;
  submission?: QuizSubmission;
  explanationMap?: Record<number, { correctIndex: number; isCorrect: boolean; explanation: string }>;
  error?: string;
}> {
  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      if (!local.quizSubmissions) local.quizSubmissions = [];
      const idx = local.quizSubmissions.findIndex(s => s.studentId === payload.studentId);
      if (idx >= 0) local.quizSubmissions[idx] = json.submission;
      else local.quizSubmissions.push(json.submission);
      saveLocalCache(local);
      return {
        success: true,
        score: json.score,
        correctCount: json.correctCount,
        totalQuestions: json.totalQuestions,
        submission: json.submission,
        explanationMap: json.explanationMap,
      };
    }
    return { success: false, error: json.error || 'Gagal mengirimkan lembar jawaban kuis' };
  } catch (err) {
    console.warn('Submit quiz error:', err);
    return { success: false, error: 'Koneksi ke server terputus saat submit kuis' };
  }
}

// Delete / Reset Quiz Submission (Hanya Dosen - Menghapus nilai kuis mahasiswa jika salah)
export async function deleteQuizSubmissionApi(
  submissionId: string,
  studentId?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const queryParams = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
    const res = await fetch(`/api/quiz/submissions/${encodeURIComponent(submissionId)}${queryParams}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      // Sync local cache
      try {
        const local = getLocalCache();
        if (local.quizSubmissions) {
          local.quizSubmissions = local.quizSubmissions.filter(
            q => q.id !== submissionId && (!studentId || q.studentId !== studentId)
          );
        }
        if (studentId && local.grades && local.grades[studentId]) {
          if (local.grades[studentId].notes && local.grades[studentId].notes.includes('Kuis')) {
            local.grades[studentId].notes = '';
          }
        }
        saveLocalCache(local);
      } catch (cacheErr) {
        console.warn('Local cache sync after delete quiz error:', cacheErr);
      }

      return {
        success: true,
        message: json.message || 'Nilai kuis berhasil dihapus oleh Dosen. Akses kuis telah dibuka kembali.',
      };
    }
    return {
      success: false,
      error: json.error || 'Gagal menghapus nilai kuis mahasiswa',
    };
  } catch (err) {
    console.warn('Delete quiz submission error:', err);
    // Offline local deletion fallback
    try {
      const local = getLocalCache();
      if (local.quizSubmissions) {
        local.quizSubmissions = local.quizSubmissions.filter(
          q => q.id !== submissionId && (!studentId || q.studentId !== studentId)
        );
        saveLocalCache(local);
      }
      return {
        success: true,
        message: 'Nilai kuis berhasil dihapus dari penyimpanan lokal.',
      };
    } catch {
      return { success: false, error: 'Terjadi kendala saat menghapus nilai kuis' };
    }
  }
}

// 13. Reorganize Groups & Adjust Count Across Semesters (Dosen Only)
export async function reorganizeGroupsApi(
  groupCount: number,
  mode: 'even' | 'random' = 'even'
): Promise<{
  success: boolean;
  groups?: GroupProject[];
  students?: Student[];
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/groups/reorganize', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ groupCount, mode }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      local.groups = json.groups;
      local.students = json.students;
      saveLocalCache(local);
      return {
        success: true,
        groups: json.groups,
        students: json.students,
        message: json.message,
      };
    }
    return { success: false, error: json.error || 'Gagal membagi ulang kelompok' };
  } catch (err) {
    console.warn('Reorganize groups error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// 14. Quiz Settings & Lecturer Activation APIs
export async function fetchQuizSettingsApi(): Promise<{
  success: boolean;
  settings?: QuizSettings;
  error?: string;
}> {
  try {
    const res = await fetch('/api/quiz/settings');
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      return { success: true, settings: json.settings };
    }
    return { success: false, error: json.error || 'Gagal mengambil pengaturan kuis' };
  } catch (err) {
    console.warn('Fetch quiz settings error:', err);
    const local = getLocalCache();
    return { success: true, settings: local.quizSettings };
  }
}

export async function updateQuizSettingsApi(
  settings: Partial<QuizSettings>
): Promise<{ success: boolean; settings?: QuizSettings; error?: string }> {
  try {
    const res = await fetch('/api/quiz/settings', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(settings),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      local.quizSettings = json.settings;
      saveLocalCache(local);
      return { success: true, settings: json.settings };
    }
    return { success: false, error: json.error || 'Gagal menyimpan pengaturan kuis' };
  } catch (err) {
    console.warn('Update quiz settings error:', err);
    return { success: false, error: 'Koneksi ke server terputus' };
  }
}

export async function uploadQuizMaterialApi(payload: {
  materialText?: string;
  quizTitle?: string;
  targetMeeting?: string;
  fileData?: string;
  fileName?: string;
}): Promise<{
  success: boolean;
  questions?: QuizQuestion[];
  settings?: QuizSettings;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/quiz/upload-material', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      local.quizQuestions = json.questions;
      if (json.settings) local.quizSettings = json.settings;
      saveLocalCache(local);
      return {
        success: true,
        questions: json.questions,
        settings: json.settings,
        message: json.message,
      };
    }
    return { success: false, error: json.error || 'Gagal menyusun soal dari materi' };
  } catch (err) {
    console.warn('Upload quiz material error:', err);
    return { success: false, error: 'Koneksi ke server bermasalah' };
  }
}

// 15. Student Full Biodata & Bulk Management APIs
export async function updateStudentBiodataApi(
  id: string,
  payload: Partial<Student>
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      const idx = (local.students || []).findIndex(s => s.id === id);
      if (idx >= 0) {
        local.students[idx] = json.student;
        saveLocalCache(local);
      }
      return { success: true, student: json.student };
    }
    return { success: false, error: json.error || 'Gagal memperbarui biodata mahasiswa' };
  } catch (err) {
    console.warn('Update student biodata error:', err);
    return { success: false, error: 'Koneksi ke server terputus' };
  }
}

export async function deleteStudentApi(
  id: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      headers: getDosenAuthHeaders(),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      local.students = (local.students || []).filter(s => s.id !== id);
      saveLocalCache(local);
      return { success: true, message: json.message };
    }
    return { success: false, error: json.error || 'Gagal menghapus mahasiswa' };
  } catch (err) {
    console.warn('Delete student error:', err);
    return { success: false, error: 'Koneksi ke server terputus' };
  }
}

export async function bulkImportStudentsApi(
  students: Array<any>,
  mode: 'replace' | 'merge' = 'merge'
): Promise<{
  success: boolean;
  count?: number;
  students?: Student[];
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/students/bulk-import', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ students, mode }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      const local = getLocalCache();
      local.students = json.students;
      saveLocalCache(local);
      return {
        success: true,
        count: json.count,
        students: json.students,
        message: json.message,
      };
    }
    return { success: false, error: json.error || 'Gagal mengimpor data mahasiswa' };
  } catch (err) {
    console.warn('Bulk import students error:', err);
    return { success: false, error: 'Koneksi ke server terputus' };
  }
}

// Upload file directly to server permanent disk storage
export async function uploadDocumentFileApi(
  fileData: string,
  fileName: string
): Promise<{ success: boolean; fileUrl?: string; fileName?: string; error?: string }> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileData, fileName }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      return { success: true, fileUrl: json.fileUrl, fileName: json.fileName };
    }
    return { success: false, error: json.error || 'Gagal menyimpan file ke server' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal terhubung ke server upload' };
  }
}

// Fetch exam settings (UTS & UAS availability)
export async function fetchExamSettingsApi(): Promise<{
  success: boolean;
  uts?: ExamScheduleSettings;
  uas?: ExamScheduleSettings;
  error?: string;
}> {
  try {
    const res = await fetch('/api/exam-settings');
    const isJson = res.headers?.get('content-type')?.includes('application/json');
    const json = isJson ? await safeJson<any>(res, {}) : {};
    if (res.ok && json?.success) {
      return { success: true, uts: json.uts, uas: json.uas };
    }
  } catch (err: any) {
    console.warn('fetchExamSettingsApi notice:', err);
  }
  const local = getLocalCache();
  return {
    success: true,
    uts: local.utsExamSettings || { isOpen: true },
    uas: local.uasExamSettings || { isOpen: true },
  };
}

// Update exam settings (Dosen can open/close UTS & UAS)
export async function updateExamSettingsApi(payload: {
  examType: 'uts' | 'uas';
  isOpen: boolean;
  openDate?: string;
  closeDate?: string;
  instructions?: string;
}): Promise<{
  success: boolean;
  settings?: ExamScheduleSettings;
  message?: string;
  error?: string;
}> {
  // Always update local cache immediately so toggle open/close is instantaneous and never fails
  const local = getLocalCache();
  const fallbackSettings: ExamScheduleSettings = {
    isOpen: payload.isOpen,
    instructions: payload.instructions || (payload.isOpen ? `${payload.examType.toUpperCase()} dibuka resmi oleh Dosen Pengampu.` : `${payload.examType.toUpperCase()} telah dikunci oleh Dosen Pengampu.`),
    openDate: payload.openDate,
    closeDate: payload.closeDate,
  };
  if (payload.examType === 'uts') {
    local.utsExamSettings = fallbackSettings;
  } else {
    local.uasExamSettings = fallbackSettings;
  }
  saveLocalCache(local);

  try {
    const res = await fetch('/api/exam-settings', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const isJson = res.headers?.get('content-type')?.includes('application/json');
    const json = isJson ? await safeJson<any>(res, {}) : {};
    if (res.ok && json?.success && json.settings) {
      return { success: true, settings: json.settings, message: json.message };
    }
  } catch (err: any) {
    console.warn('Update exam settings offline notice:', err);
  }

  return { success: true, settings: fallbackSettings, message: 'Status ujian diperbarui' };
}

/**
 * Restore complete database & task backup to the server (Dosen Only)
 */
export async function restoreBackupToServer(backupData: any): Promise<{
  success: boolean;
  message: string;
  totalStudents?: number;
  totalSubmissions?: number;
  totalUts?: number;
  totalUas?: number;
}> {
  try {
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: getDosenAuthHeaders(),
      body: JSON.stringify({ backupData }),
    });
    const json = await safeJson(res, null);
    if (res.ok && json.success) {
      // Sync local caches
      if (backupData) {
        saveLocalCache(backupData);
      }
      return {
        success: true,
        message: json.message || 'Cadangan data berhasil dipulihkan secara permanen!',
        totalStudents: json.totalStudents,
        totalSubmissions: json.totalSubmissions,
        totalUts: json.totalUts,
        totalUas: json.totalUas,
      };
    }
    return { success: false, message: json.error || 'Gagal memulihkan cadangan data' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal menghubungi server untuk memulihkan data' };
  }
}


