import {
  SiakadDatabase,
  Student,
  TaskDeadlineItem,
  AppNotification,
  IndividualSubmission,
  UtsSubmission,
} from '../types';

const SIMULATION_STORAGE_KEY = 'siakad_simulate_urgent_deadline';
const DISMISSED_BANNER_KEY = 'siakad_dismissed_deadline_banner';
const READ_NOTIFICATIONS_KEY = 'siakad_read_notifications_ids';
const DELETED_NOTIFICATIONS_KEY = 'siakad_deleted_notifications_ids';
const CUSTOM_DEADLINES_KEY = 'siakad_custom_task_deadlines';

/**
 * Get list of notification IDs deleted by lecturer
 */
export function getDeletedNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Delete a notification (Lecturer only)
 */
export function deleteNotification(id: string): void {
  try {
    const list = getDeletedNotificationIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Failed to delete notification:', e);
  }
}

/**
 * Delete all notifications (Lecturer only)
 */
export function deleteAllNotifications(ids: string[]): void {
  try {
    const list = getDeletedNotificationIds();
    ids.forEach(id => {
      if (!list.includes(id)) list.push(id);
    });
    localStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to delete all notifications:', e);
  }
}

export function isNotificationDeleted(id: string): boolean {
  return getDeletedNotificationIds().includes(id);
}

/**
 * Get custom deadlines configured by lecturer or testing
 */
export function getCustomDeadlines(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CUSTOM_DEADLINES_KEY);
    if (!raw || (!raw.trim().startsWith('{') && !raw.trim().startsWith('['))) {
      return {};
    }
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save custom deadline for a task
 */
export function setCustomDeadline(taskId: string, isoString: string): void {
  try {
    const current = getCustomDeadlines();
    current[taskId] = isoString;
    localStorage.setItem(CUSTOM_DEADLINES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save custom deadline:', e);
  }
}

/**
 * Check if simulation of < 24h deadline is enabled (defaults to false so notifications are clean until configured)
 */
export function isUrgentDeadlineSimulated(): boolean {
  try {
    const val = localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (val === null) return false;
    return val === 'true';
  } catch {
    return false;
  }
}

export function setUrgentDeadlineSimulation(enabled: boolean): void {
  try {
    localStorage.setItem(SIMULATION_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to set simulation:', e);
  }
}

/**
 * Format hours and minutes remaining into human readable Indonesian string
 */
export function formatTimeRemaining(hours: number, minutes: number): string {
  if (hours < 0 || minutes < 0) {
    return 'Waktu telah berakhir (Lewat Deadline)';
  }
  if (hours === 0) {
    return `${minutes} menit lagi`;
  }
  return `${hours} jam ${minutes % 60} menit lagi`;
}

/**
 * Calculate all deadlines from meetings and tasks in the database
 */
export function calculateAllDeadlines(
  db: SiakadDatabase,
  currentStudentId: string | null
): {
  allDeadlines: TaskDeadlineItem[];
  urgentDeadlines: TaskDeadlineItem[];
  nearestDeadline: TaskDeadlineItem | null;
} {
  const customDeadlines = getCustomDeadlines();
  const simulated = isUrgentDeadlineSimulated();
  const now = new Date();
  const allDeadlines: TaskDeadlineItem[] = [];

  const currentStudent = (db.students || []).find(s => s.id === currentStudentId);

  // 1. Simulated Demo Deadline (Ensures user instantly sees and tests the < 24 jam notification banner)
  if (simulated) {
    // Generate a deadline set to 14 hours and 20 minutes from right now
    const simDate = new Date(now.getTime() + (14 * 60 + 20) * 60 * 1000);
    const diffMs = simDate.getTime() - now.getTime();
    const hoursRem = Math.floor(diffMs / (1000 * 60 * 60));
    const minsRem = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const simStudent = currentStudent || db.students?.[0];
    const isSubmitted = (db.submissions || []).some(
      s => s.studentId === simStudent?.id && s.meetingNumber === 2
    );

    allDeadlines.push({
      id: 'sim-urgent-task-p2',
      taskType: 'individu',
      title: 'Tugas Makalah & PPT Presentasi (Pertemuan 2)',
      meetingNumber: 2,
      deadlineIso: simDate.toISOString(),
      deadlineFormatted: simDate.toLocaleString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB',
      hoursRemaining: hoursRem,
      minutesRemaining: minsRem,
      isUrgent: true,
      isVeryUrgent: hoursRem < 6,
      isOverdue: false,
      isCompleted: isSubmitted,
      targetTab: 'tugas-individu',
      studentId: simStudent?.id,
      studentName: simStudent?.name,
      description: 'Pengumpulan slide presentasi PowerPoint dan makalah bab 1 filsafat ilmu sebelum perkuliahan dimulai.',
    });
  }

  // 2. Deadlines derived from Meetings (Pertemuan 1 - 16)
  (db.meetings || []).forEach(m => {
    // Check custom override or calculate from isoDate
    const customIso = customDeadlines[`meeting-${m.meetingNumber}`];
    let deadlineDate: Date;

    if (customIso) {
      deadlineDate = new Date(customIso);
    } else if (m.isoDate) {
      // Default to 23:59:59 on the meeting date
      deadlineDate = new Date(`${m.isoDate}T23:59:59`);
    } else {
      deadlineDate = new Date(now.getTime() + m.meetingNumber * 7 * 24 * 60 * 60 * 1000);
    }

    const diffMs = deadlineDate.getTime() - now.getTime();
    const hoursRem = Math.floor(diffMs / (1000 * 60 * 60));
    const minsRem = Math.floor(diffMs / (1000 * 60));

    // Determine task type and completion
    let taskType: TaskDeadlineItem['taskType'] = 'individu';
    let targetTab = 'tugas-individu';
    let isCompleted = false;

    if (m.type === 'uts' || m.meetingNumber === 8) {
      taskType = 'uts';
      targetTab = 'tugas-uts';
      isCompleted = (db.utsSubmissions || []).some(
        u => u.studentId === currentStudentId
      );
    } else if (m.type === 'uas' || m.meetingNumber === 16) {
      taskType = 'uas';
      targetTab = 'tugas-uas';
      isCompleted = (db.uasSubmissions || []).some(
        u => u.studentId === currentStudentId
      ) || (db.groups || []).some(
        g => g.id === currentStudent?.groupId && !!g.submission?.videoUrl
      );
    } else {
      // Individual presentation
      isCompleted = (db.submissions || []).some(
        s => s.studentId === currentStudentId && s.meetingNumber === m.meetingNumber
      );
    }

    const isUrgent = hoursRem >= 0 && hoursRem < 24;
    const isVeryUrgent = hoursRem >= 0 && hoursRem < 6;
    const isOverdue = diffMs < 0;

    allDeadlines.push({
      id: `deadline-meeting-${m.meetingNumber}`,
      taskType,
      title: m.meetingNumber === 8
        ? 'Ujian Tengah Semester (UTS Esai Filsafat)'
        : m.meetingNumber === 16
        ? 'Ujian Akhir Semester (UAS Proyek Video)'
        : `Tugas PPT & Makalah Pertemuan ${m.meetingNumber}`,
      meetingNumber: m.meetingNumber,
      deadlineIso: deadlineDate.toISOString(),
      deadlineFormatted: deadlineDate.toLocaleString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB',
      hoursRemaining: hoursRem,
      minutesRemaining: minsRem,
      isUrgent,
      isVeryUrgent,
      isOverdue,
      isCompleted,
      targetTab,
      studentId: currentStudentId || undefined,
      studentName: currentStudent?.name,
      description: m.title,
    });
  });

  // Sort: Urgent non-completed first, then soonest deadline
  allDeadlines.sort((a, b) => {
    if (a.isUrgent && !a.isCompleted && (!b.isUrgent || b.isCompleted)) return -1;
    if (b.isUrgent && !b.isCompleted && (!a.isUrgent || a.isCompleted)) return 1;
    return new Date(a.deadlineIso).getTime() - new Date(b.deadlineIso).getTime();
  });

  const urgentDeadlines = allDeadlines.filter(d => d.isUrgent && !d.isCompleted);
  const nearestDeadline = urgentDeadlines[0] || allDeadlines.find(d => !d.isCompleted && !d.isOverdue) || allDeadlines[0];

  return {
    allDeadlines,
    urgentDeadlines,
    nearestDeadline,
  };
}

/**
 * Get formatted feed of recent submissions across all students
 */
export function getRecentSubmissionsList(db: SiakadDatabase): AppNotification[] {
  const notifications: AppNotification[] = [];
  const deletedIds = new Set([
    ...getDeletedNotificationIds(),
    ...(db.deletedNotificationIds || []),
  ]);

  const gradedIndStudentIds = new Set<string>();
  const gradedUtsStudentIds = new Set<string>();
  const gradedGroupIds = new Set<number>();

  // 1. Individual Tasks Submissions (PPT & Makalah)
  (db.submissions || []).forEach(sub => {
    const subNotifId = `sub-ind-${sub.id}`;
    if (!deletedIds.has(subNotifId) && sub.submittedAt) {
      notifications.push({
        id: subNotifId,
        type: 'submission',
        title: `Tugas Dikumpulkan: Pertemuan ${sub.meetingNumber}`,
        message: `${sub.studentName} mengumpulkan tugas ${sub.submissionChoice === 'ppt_only' ? 'Slide PPT' : sub.submissionChoice === 'makalah_only' ? 'Makalah' : 'PPT & Makalah'}: "${sub.topic || 'Materi Kuliah'}"`,
        timestamp: sub.submittedAt,
        taskType: 'Tugas PPT & Makalah',
        studentName: sub.studentName,
        studentId: sub.studentId,
        targetTab: 'tugas-individu',
        read: isNotificationRead(subNotifId),
      });
    }

    // 1b. Graded notification from Lecturer
    const effectiveGrade = sub.grade !== undefined ? sub.grade : db.grades?.[sub.studentId]?.individualScore;
    const effectiveFeedback = sub.feedback || db.grades?.[sub.studentId]?.notes;
    const gradeNotifId = `grade-ind-${sub.studentId || sub.id}`;
    if (effectiveGrade !== undefined && effectiveGrade > 0 && !deletedIds.has(gradeNotifId)) {
      gradedIndStudentIds.add(sub.studentId);
      notifications.push({
        id: gradeNotifId,
        type: 'grade',
        title: `Tugas Dinilai Dosen: ${sub.rpsPart || `Pertemuan ${sub.meetingNumber || 2}`}`,
        message: `Tugas presentasi "${sub.topic || 'Materi'}" telah dinilai oleh Dosen Pengampu (${db.courseProfile?.dosenName || 'Dosen Pengampu'}) dengan Nilai: ${effectiveGrade}/100.${effectiveFeedback ? ` Catatan Evaluasi: "${effectiveFeedback}"` : ''}`,
        timestamp: sub.gradedAt || sub.submittedAt || new Date().toISOString(),
        taskType: 'Penilaian Dosen',
        studentName: sub.studentName,
        studentId: sub.studentId,
        targetTab: 'tugas-individu',
        read: isNotificationRead(gradeNotifId),
      });
    }
  });

  // Catch students who have an individual grade in db.grades but weren't in db.submissions list
  (db.students || []).forEach(std => {
    if (gradedIndStudentIds.has(std.id)) return;
    const stdGrade = db.grades?.[std.id] || (std.nim ? db.grades?.[std.nim] : undefined);
    if (stdGrade && stdGrade.individualScore !== undefined && stdGrade.individualScore > 0) {
      const gradeNotifId = `grade-ind-${std.id}`;
      if (!deletedIds.has(gradeNotifId)) {
        gradedIndStudentIds.add(std.id);
        notifications.push({
          id: gradeNotifId,
          type: 'grade',
          title: `Tugas Dinilai Dosen: ${std.rpsPart || `Pertemuan ${std.meetingNumber || 2}`}`,
          message: `Tugas presentasi "${std.topic || 'Materi Kuliah'}" telah dinilai oleh Dosen Pengampu dengan Nilai: ${stdGrade.individualScore}/100.${stdGrade.notes ? ` Catatan: "${stdGrade.notes}"` : ''}`,
          timestamp: new Date().toISOString(),
          taskType: 'Penilaian Dosen',
          studentName: std.name,
          studentId: std.id,
          targetTab: 'tugas-individu',
          read: isNotificationRead(gradeNotifId),
        });
      }
    }
  });

  // 2. UTS Submissions
  (db.utsSubmissions || []).forEach(uts => {
    const subUtsId = `sub-uts-${uts.id}`;
    if (!deletedIds.has(subUtsId) && uts.submittedAt) {
      notifications.push({
        id: subUtsId,
        type: 'submission',
        title: 'Ujian Tengah Semester (UTS) Dikumpulkan',
        message: `${uts.studentName} telah mengirimkan 5 jawaban esai UTS (Skor AI: ${uts.aiVerdict || 'Tervalidasi'})`,
        timestamp: uts.submittedAt,
        taskType: 'UTS 5 Soal Esai',
        studentName: uts.studentName,
        studentId: uts.studentId,
        targetTab: 'tugas-uts',
        read: isNotificationRead(subUtsId),
      });
    }

    // 2b. UTS Graded notification
    const effectiveUtsGrade = uts.grade !== undefined ? uts.grade : db.grades?.[uts.studentId]?.utsScore;
    const effectiveUtsFeedback = uts.feedback || db.grades?.[uts.studentId]?.notes;
    const gradeUtsId = `grade-uts-${uts.studentId || uts.id}`;
    if (effectiveUtsGrade !== undefined && effectiveUtsGrade > 0 && !deletedIds.has(gradeUtsId)) {
      gradedUtsStudentIds.add(uts.studentId);
      notifications.push({
        id: gradeUtsId,
        type: 'grade',
        title: 'UTS Telah Dinilai Dosen',
        message: `Lembar jawaban UTS Anda telah dinilai oleh Dosen Pengampu (${db.courseProfile?.dosenName || 'Dosen Pengampu'}) dengan Nilai: ${effectiveUtsGrade}/100.${effectiveUtsFeedback ? ` Catatan: "${effectiveUtsFeedback}"` : ''}`,
        timestamp: uts.gradedAt || uts.submittedAt || new Date().toISOString(),
        taskType: 'Penilaian Dosen',
        studentName: uts.studentName,
        studentId: uts.studentId,
        targetTab: 'tugas-uts',
        read: isNotificationRead(gradeUtsId),
      });
    }
  });

  // Catch students who have UTS score in db.grades
  (db.students || []).forEach(std => {
    if (gradedUtsStudentIds.has(std.id)) return;
    const stdGrade = db.grades?.[std.id] || (std.nim ? db.grades?.[std.nim] : undefined);
    if (stdGrade && stdGrade.utsScore !== undefined && stdGrade.utsScore > 0) {
      const gradeUtsId = `grade-uts-${std.id}`;
      if (!deletedIds.has(gradeUtsId)) {
        gradedUtsStudentIds.add(std.id);
        notifications.push({
          id: gradeUtsId,
          type: 'grade',
          title: 'UTS Telah Dinilai Dosen',
          message: `Lembar jawaban UTS telah dinilai oleh Dosen Pengampu dengan Nilai: ${stdGrade.utsScore}/100.${stdGrade.notes ? ` Catatan: "${stdGrade.notes}"` : ''}`,
          timestamp: new Date().toISOString(),
          taskType: 'Penilaian Dosen',
          studentName: std.name,
          studentId: std.id,
          targetTab: 'tugas-uts',
          read: isNotificationRead(gradeUtsId),
        });
      }
    }
  });

  // 3. UAS / Video Kelompok Submissions
  (db.groups || []).forEach(grp => {
    const hasGroupSubmitted = Boolean(grp.submission && (grp.submission.submittedAt || grp.submission.videoUrl));
    const subGroupId = `sub-group-${grp.id}`;
    if (hasGroupSubmitted && !deletedIds.has(subGroupId)) {
      notifications.push({
        id: subGroupId,
        type: 'submission',
        title: `Proyek Video UAS Dikumpulkan (${grp.name})`,
        message: `${grp.submission?.submittedBy || grp.name} mengunggah video proyek: "${grp.title}"`,
        timestamp: grp.submission?.submittedAt || new Date().toISOString(),
        taskType: 'Proyek Video UAS',
        studentName: grp.submission?.submittedBy || grp.name,
        targetTab: 'tugas-uas',
        read: isNotificationRead(subGroupId),
      });
    }

    // 3b. Group Video UAS Graded notification
    const effectiveGroupGrade = grp.grade !== undefined ? grp.grade : grp.submission?.grade;
    const gradeGroupId = `grade-group-${grp.id}`;
    if (effectiveGroupGrade !== undefined && effectiveGroupGrade > 0 && !deletedIds.has(gradeGroupId)) {
      gradedGroupIds.add(grp.id);
      notifications.push({
        id: gradeGroupId,
        type: 'grade',
        title: `Proyek UAS Dinilai: ${grp.name}`,
        message: `Proyek Video UAS "${grp.title}" telah dinilai oleh Dosen Pengampu dengan Nilai: ${effectiveGroupGrade}/100.${grp.feedback ? ` Catatan: "${grp.feedback}"` : ''}`,
        timestamp: grp.gradedAt || new Date().toISOString(),
        taskType: 'Penilaian Dosen',
        studentName: grp.name,
        targetTab: 'tugas-uas',
        read: isNotificationRead(gradeGroupId),
      });
    }
  });

  // 4. UAS Submissions (Individu / Essay)
  (db.uasSubmissions || []).forEach(uas => {
    const subUasId = `sub-uas-ind-${uas.id}`;
    if (!deletedIds.has(subUasId) && uas.submittedAt) {
      notifications.push({
        id: subUasId,
        type: 'submission',
        title: 'Lembar UAS Dikumpulkan',
        message: `${uas.studentName} telah mengumpulkan lembar jawaban UAS`,
        timestamp: uas.submittedAt,
        taskType: 'Tugas UAS',
        studentName: uas.studentName,
        studentId: uas.studentId,
        targetTab: 'tugas-uas',
        read: isNotificationRead(subUasId),
      });
    }

    const effectiveUasGrade = uas.grade !== undefined ? uas.grade : db.grades?.[uas.studentId]?.uasScore;
    const gradeUasId = `grade-uas-ind-${uas.studentId || uas.id}`;
    if (effectiveUasGrade !== undefined && effectiveUasGrade > 0 && !deletedIds.has(gradeUasId)) {
      notifications.push({
        id: gradeUasId,
        type: 'grade',
        title: 'UAS Telah Dinilai Dosen',
        message: `Tugas UAS Anda telah dinilai oleh Dosen Pengampu dengan Nilai: ${effectiveUasGrade}/100.`,
        timestamp: uas.gradedAt || uas.submittedAt || new Date().toISOString(),
        taskType: 'Penilaian Dosen',
        studentName: uas.studentName,
        studentId: uas.studentId,
        targetTab: 'tugas-uas',
        read: isNotificationRead(gradeUasId),
      });
    }
  });

  // Sort descending by timestamp
  notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return notifications;
}

/**
 * Check if a notification ID has been marked read
 */
export function isNotificationRead(id: string): boolean {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    if (!raw || (!raw.trim().startsWith('{') && !raw.trim().startsWith('['))) {
      return false;
    }
    const readList: string[] = JSON.parse(raw);
    return Array.isArray(readList) && readList.includes(id);
  } catch {
    return false;
  }
}

/**
 * Mark notification as read
 */
export function markNotificationAsRead(id: string): void {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    const readList: string[] = (raw && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) ? JSON.parse(raw) : [];
    if (Array.isArray(readList) && !readList.includes(id)) {
      readList.push(id);
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readList));
    }
  } catch (e) {
    console.warn('Failed to mark read:', e);
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(ids: string[]): void {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATIONS_KEY);
    const readList: string[] = (raw && (raw.trim().startsWith('{') || raw.trim().startsWith('['))) ? JSON.parse(raw) : [];
    if (Array.isArray(readList)) {
      ids.forEach(id => {
        if (!readList.includes(id)) readList.push(id);
      });
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(readList));
    }
  } catch (e) {
    console.warn('Failed to mark all read:', e);
  }
}

/**
 * Dismiss deadline banner until dismissed timestamp expires (e.g. 2 hours)
 */
export function isDeadlineBannerDismissed(): boolean {
  try {
    const dismissedUntil = localStorage.getItem(DISMISSED_BANNER_KEY);
    if (!dismissedUntil) return false;
    return new Date().getTime() < Number(dismissedUntil);
  } catch {
    return false;
  }
}

export function dismissDeadlineBanner(hours: number = 2): void {
  try {
    const until = new Date().getTime() + hours * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_BANNER_KEY, String(until));
  } catch (e) {
    console.warn('Failed to dismiss banner:', e);
  }
}

export function unDismissDeadlineBanner(): void {
  try {
    localStorage.removeItem(DISMISSED_BANNER_KEY);
  } catch (e) {
    console.warn('Failed to undismiss banner:', e);
  }
}

/**
 * Get all notifications specifically regarding grades given by Lecturer for a specific student
 */
export function getStudentGradedNotifications(db: SiakadDatabase, studentId: string): AppNotification[] {
  if (!studentId) return [];
  const allNotifs = getRecentSubmissionsList(db);
  const student = (db.students || []).find(s => s.id === studentId);
  const studentName = student?.name;

  return allNotifs.filter(n => {
    if (n.type !== 'grade') return false;
    if (n.studentId === studentId) return true;
    if (studentName && n.studentName && n.studentName.toLowerCase().includes(studentName.toLowerCase())) return true;
    // For group projects, check if student is in the group
    if (n.taskType === 'Nilai Proyek UAS' && studentName) {
      const group = (db.groups || []).find(g => g.name === n.studentName);
      if (group && Array.isArray(group.members) && group.members.includes(studentName)) {
        return true;
      }
    }
    return false;
  });
}

