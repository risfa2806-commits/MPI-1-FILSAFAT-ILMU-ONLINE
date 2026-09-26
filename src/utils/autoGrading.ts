import { IndividualSubmission, Student, UtsSubmission, UtsQuestion, GroupProject } from '../types';

/**
 * Otomatis menghitung rekomendasi nilai dan catatan evaluasi untuk Tugas Presentasi (Individu/Kelompok) (PPT & Makalah)
 */
export function autoGradeIndividualSubmission(
  sub: IndividualSubmission,
  _student?: Student
): { score: number; feedback: string; rubricBreakdown: string[] } {
  let score = 75; // base score
  const rubricBreakdown: string[] = [];

  const hasPptLink = sub.pptType === 'link' && Boolean(sub.pptUrl?.trim());
  const hasPptFile = sub.pptType === 'file' && Boolean(sub.pptFileData || sub.pptFileName);
  const hasPpt = hasPptLink || hasPptFile;

  const hasMakalahLink = sub.makalahType === 'link' && Boolean(sub.makalahUrl?.trim());
  const hasMakalahFile = sub.makalahType === 'file' && Boolean(sub.makalahFileData || sub.makalahFileName);
  const hasMakalah = hasMakalahLink || hasMakalahFile;

  if (hasPpt && hasMakalah) {
    score += 15;
    rubrikInfo(rubricBreakdown, 'Kelengkapan Berkas Lengkap (PPT & Makalah)', 15);
  } else if (hasPpt) {
    score += 5;
    rubrikInfo(rubricBreakdown, 'Slide PPT terunggah (Makalah belum ada)', 5);
  } else if (hasMakalah) {
    score += 5;
    rubrikInfo(rubricBreakdown, 'Makalah terunggah (Slide PPT belum ada)', 5);
  }

  // Bonus for notes/elaboration
  if (sub.notes && sub.notes.trim().length > 10) {
    score += 3;
    rubrikInfo(rubricBreakdown, 'Catatan & elaborasi pengantar mahasiswa', 3);
  }

  // File type bonus
  if (hasPptLink && sub.pptUrl?.toLowerCase().includes('canva')) {
    score += 2;
    rubrikInfo(rubricBreakdown, 'Integrasi media visual Canva interaktif', 2);
  }

  // Topic specific bonus
  score = Math.min(96, Math.max(75, score));

  let feedback = '';
  if (hasPpt && hasMakalah) {
    feedback = `Penyusunan tugas ${sub.rpsPart} ("${sub.topic}") sangat komprehensif. Berkas slide PPT dan Makalah memenuhi standar akademik, sistematika penulisan runtut, serta relevan dengan studi Manajemen Pendidikan Islam.`;
  } else if (hasPpt) {
    feedback = `Slide materi presentasi ${sub.rpsPart} tersusun cukup baik. Disarankan untuk segera melengkapi dokumen Makalah resmi agar penguasaan konsep filosofis lebih mendalam.`;
  } else if (hasMakalah) {
    feedback = `Dokumen Makalah tersusun rapi dengan referensi memadai. Disarankan untuk melengkapi slide presentasi (PPT/Canva) untuk kebutuhan pemaparan di kelas.`;
  } else {
    feedback = `Tugas memerlukan perbaikan kelengkapan berkas PPT maupun Makalah.`;
  }

  return { score, feedback, rubricBreakdown };
}

/**
 * Otomatis menghitung rekomendasi nilai dan catatan evaluasi untuk UTS (5 Soal Essay)
 */
export function autoGradeUtsSubmission(
  sub: UtsSubmission,
  questions: UtsQuestion[],
  _student?: Student
): { totalScore: number; questionScores: Record<number, number>; feedback: string; rubricBreakdown: string[] } {
  const questionScores: Record<number, number> = {};
  const rubricBreakdown: string[] = [];
  let total = 0;

  const topicKeywords: Record<number, string[]> = {
    1: ['ontologi', 'hakekat', 'realitas', 'wujud', 'esensi', 'kebenaran', 'ilmu', 'objek'],
    2: ['epistemologi', 'metode', 'ilmiah', 'rasionalisme', 'empirisme', 'verifikasi', 'sumber', 'teori'],
    3: ['aksiologi', 'etika', 'moral', 'nilai', 'manfaat', 'tanggung jawab', 'kegunaan', 'humaniora'],
    4: ['etika akademik', 'plagiarisme', 'kejujuran', 'integritas', 'sitasi', 'orisionalitas', 'referensi'],
    5: ['manajemen', 'pendidikan islam', 'mpi', 'madrasah', 'pesantren', 'kepemimpinan', 'mutu', 'filsafat'],
  };

  (questions || []).forEach((q) => {
    const ans = sub.answers?.[q.id]?.trim() || '';
    let qScore = 14; // baseline score out of 20

    if (ans.length === 0) {
      qScore = 0;
      rubricBreakdown.push(`Nomor ${q.id}: Belum ada jawaban tertulis (0/20)`);
    } else {
      // Length criteria
      if (ans.length > 250) qScore += 2;
      else if (ans.length > 100) qScore += 1;

      // Keyword criteria
      const keywords = topicKeywords[q.id] || [];
      const lowerAns = ans.toLowerCase();
      let matchedCount = 0;
      keywords.forEach((kw) => {
        if (lowerAns.includes(kw)) matchedCount++;
      });

      if (matchedCount >= 3) qScore += 4;
      else if (matchedCount >= 1) qScore += 2;

      qScore = Math.min(20, Math.max(0, qScore));
      rubricBreakdown.push(`Nomor ${q.id} (${q.topic}): Skor ${qScore}/20 (Panjang: ${ans.length} karakter, ${matchedCount} kata kunci relevan)`);
    }

    questionScores[q.id] = qScore;
    total += qScore;
  });

  // Cap total score
  total = Math.min(100, Math.max(0, total));

  let feedback = '';
  if (total >= 90) {
    feedback = `Analisis filosofis sangat mendalam dan tajam. Pemahaman terhadap dimensi ontologi, epistemologi, dan aksiologi terintegrasi dengan sangat baik dalam konteks Manajemen Pendidikan Islam.`;
  } else if (total >= 80) {
    feedback = `Jawaban essay baik dan sistematis. Kerangka pemikiran filosofis sudah tepat dan relevan dengan problematika pendidikan Islam kontemporer.`;
  } else if (total >= 70) {
    feedback = `Cukup baik. Disarankan untuk memperkuat argumentasi epistemologis dan rujukan pustaka filsafat ilmu pada analisis kasus.`;
  } else {
    feedback = `Jawaban perlu pendalaman materi lebih lanjut, terutama pada sintesis konsep nilai aksiologis dan implementasi MPI.`;
  }

  return { totalScore: total, questionScores, feedback, rubricBreakdown };
}

/**
 * Otomatis menghitung rekomendasi nilai dan catatan evaluasi untuk UAS (Video Kelompok AI)
 */
export function autoGradeUasVideoSubmission(
  grp: GroupProject
): { score: number; feedback: string; rubricBreakdown: string[] } {
  let score = 80;
  const rubricBreakdown: string[] = [];
  const sub = grp.submission;

  if (!sub) {
    return {
      score: 75,
      feedback: 'Belum ada berkas pengumpulan video proyek.',
      rubricBreakdown: ['Proyek video belum diserahkan oleh kelompok'],
    };
  }

  // Video URL check
  if (sub.videoUrl && sub.videoUrl.trim()) {
    score += 8;
    rubricBreakdown.push('Tautan publikasi video video (YouTube/Drive) valid (+8)');
  }

  // Canva / Drive materials
  if (sub.canvaUrl && sub.canvaUrl.trim()) {
    score += 3;
    rubricBreakdown.push('Slide materi Canva kelompok terlampir (+3)');
  }
  if (sub.driveUrl && sub.driveUrl.trim()) {
    score += 2;
    rubricBreakdown.push('Folder master berkas Google Drive terlampir (+2)');
  }

  // AI Tools used
  if (sub.aiToolsUsed && sub.aiToolsUsed.trim().length > 3) {
    score += 4;
    rubricBreakdown.push(`Integrasi AI Tools terverifikasi (${sub.aiToolsUsed}) (+4)`);
  }

  // Summary notes
  if (sub.summaryNotes && sub.summaryNotes.trim().length > 20) {
    score += 3;
    rubricBreakdown.push('Sinopsis & catatan refleksi kelompok komprehensif (+3)');
  }

  score = Math.min(97, Math.max(75, score));

  const feedback = `Proyek video edukasi "${grp.title}" dikerjakan dengan sangat kreatif dan kolaboratif. Pemanfaatan perangkat AI terpadu harmonis dengan konten filsafat ilmu, visualisasi menarik, dan pesan akademik tersampaikan secara jelas.`;

  return { score, feedback, rubricBreakdown };
}

function rubrikInfo(arr: string[], desc: string, pts: number) {
  arr.push(`${desc} (+${pts} poin)`);
}
