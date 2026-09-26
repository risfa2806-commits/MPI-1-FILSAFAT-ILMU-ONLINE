import React, { useState } from 'react';
import { QuizQuestion } from '../../types';
import { cartoonAudio } from '../../utils/cartoonAudio';
import { Sparkles, Trophy, CheckCircle2, RotateCcw } from 'lucide-react';

interface CartoonFrogGameProps {
  question: QuizQuestion;
  questionNumber?: number;
  totalQuestions?: number;
  selectedOptionIndex?: number;
  selectedAnswer?: number;
  onSelectOption?: (optionIndex: number) => void;
  onSelectAnswer?: (optionIndex: number) => void;
  onNextQuestion?: () => void;
  onNext?: () => void;
  onPrevQuestion?: () => void;
  onPrev?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isLastQuestion?: boolean;
  onSubmit: () => void;
  submitting?: boolean;
  answeredCount?: number;
}

export const CartoonFrogGame: React.FC<CartoonFrogGameProps> = ({
  question,
  questionNumber,
  totalQuestions = 10,
  selectedOptionIndex,
  selectedAnswer,
  onSelectOption,
  onSelectAnswer,
  onNextQuestion,
  onNext,
  onPrevQuestion,
  onPrev,
  hasPrev,
  hasNext,
  isFirst,
  isLast,
  isLastQuestion,
  onSubmit,
  submitting = false,
}) => {
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [targetPad, setTargetPad] = useState<number | null>(null);
  const [frogExpression, setFrogExpression] = useState<'happy' | 'crouch' | 'cheer' | 'blink'>('happy');

  // Safe handlers to prevent TypeError if caller passes either onSelectOption or onSelectAnswer
  const safeSelectOption = (idx: number) => {
    if (typeof onSelectOption === 'function') {
      onSelectOption(idx);
    } else if (typeof onSelectAnswer === 'function') {
      onSelectAnswer(idx);
    }
  };

  const safeNext = () => {
    if (typeof onNextQuestion === 'function') {
      onNextQuestion();
    } else if (typeof onNext === 'function') {
      onNext();
    }
  };

  const safePrev = () => {
    if (typeof onPrevQuestion === 'function') {
      onPrevQuestion();
    } else if (typeof onPrev === 'function') {
      onPrev();
    }
  };

  const currentSelectedIdx = selectedOptionIndex !== undefined ? selectedOptionIndex : selectedAnswer;
  const canGoPrev = hasPrev !== undefined ? hasPrev : isFirst !== undefined ? !isFirst : true;
  const isFinalQuestion = isLastQuestion !== undefined ? isLastQuestion : isLast !== undefined ? isLast : false;
  const currentQNum = questionNumber !== undefined ? questionNumber : (question?.id || 1);

  const optionLetters = ['A', 'B', 'C', 'D'];

  const handleFrogJump = (idx: number) => {
    setTargetPad(idx);
    setIsJumping(true);
    setFrogExpression('crouch');

    // Play frog jump sound and splash
    cartoonAudio.playFrogJump();
    setTimeout(() => {
      cartoonAudio.playSplash();
    }, 180);

    safeSelectOption(idx);

    // Expression feedback
    setTimeout(() => {
      setIsJumping(false);
      if (idx === question.correctIndex) {
        setFrogExpression('cheer');
        cartoonAudio.playCorrectChime();
      } else {
        setFrogExpression('blink');
        cartoonAudio.playWrongBoing();
      }
    }, 400);

    // Return to happy after delay
    setTimeout(() => {
      setFrogExpression('happy');
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Frog Pond Stage */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-teal-400 via-emerald-400 to-cyan-600 border-4 border-emerald-500 shadow-xl p-4 sm:p-6 min-h-[420px] sm:min-h-[460px] flex flex-col justify-between select-none">
        
        {/* Pond Water Ripple Texture & Floating Flowers */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />
        
        <div className="absolute top-3 left-4 bg-emerald-950/40 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white border border-emerald-300/30 flex items-center gap-2">
          <span className="text-base">🐸</span>
          <span>Si Katak Filo Menangkap Daun Teratai</span>
          <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
        </div>

        {/* Question Header Card floating on water */}
        <div className="relative z-10 max-w-2xl mx-auto w-full mt-7 bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border-3 border-emerald-300 shadow-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="bg-emerald-600 text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wide shadow-xs">
              Soal {questionNumber} / {totalQuestions}
            </span>
            <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-3 py-0.5 rounded-full border border-amber-300">
              {question.badgeTopic || 'RPS Filsafat'}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-snug">
            {question.question}
          </h3>
        </div>

        {/* Central Cartoon Frog Mascot sitting on Lotus Pad */}
        <div className="relative z-10 flex flex-col items-center justify-center my-3">
          <div
            className={`relative transition-all duration-300 transform ${
              isJumping
                ? 'scale-110 -translate-y-8 rotate-3'
                : frogExpression === 'cheer'
                ? 'scale-110 -translate-y-2'
                : 'hover:scale-105'
            }`}
          >
            {/* Animated Cartoon Frog SVG */}
            <div className="relative w-28 h-24 sm:w-32 sm:h-28 mx-auto flex items-center justify-center filter drop-shadow-lg">
              
              {/* Graduate Cap on Frog Head */}
              <div className="absolute -top-3 z-20 transform -rotate-6">
                <div className="w-10 h-3 bg-slate-900 rounded-xs shadow-md mx-auto" />
                <div className="w-4 h-3 bg-slate-800 mx-auto -mt-0.5" />
                <div className="absolute right-0 top-1 w-1.5 h-4 bg-amber-400 rounded-full" />
              </div>

              {/* Frog Body SVG */}
              <svg viewBox="0 0 100 85" className="w-full h-full overflow-visible">
                {/* Back Legs / Flipper Feet */}
                <ellipse cx="20" cy="72" rx="16" ry="8" fill="#15803d" />
                <ellipse cx="80" cy="72" rx="16" ry="8" fill="#15803d" />

                {/* Main Body */}
                <ellipse cx="50" cy="55" rx="35" ry="28" fill="#22c55e" stroke="#16a34a" strokeWidth="2.5" />
                {/* Yellow Belly */}
                <ellipse cx="50" cy="60" rx="22" ry="18" fill="#fef08a" />

                {/* Left Eye */}
                <circle cx="34" cy="26" r="14" fill="#22c55e" stroke="#16a34a" strokeWidth="2.5" />
                <circle cx="34" cy="26" r="9" fill="#ffffff" />
                <circle cx="36" cy="26" r="5" fill="#0f172a" />
                <circle cx="38" cy="24" r="2" fill="#ffffff" />

                {/* Right Eye */}
                <circle cx="66" cy="26" r="14" fill="#22c55e" stroke="#16a34a" strokeWidth="2.5" />
                <circle cx="66" cy="26" r="9" fill="#ffffff" />
                <circle cx="64" cy="26" r="5" fill="#0f172a" />
                <circle cx="62" cy="24" r="2" fill="#ffffff" />

                {/* Rosy Cheeks */}
                <circle cx="28" cy="48" r="5" fill="#f43f5e" opacity="0.6" />
                <circle cx="72" cy="48" r="5" fill="#f43f5e" opacity="0.6" />

                {/* Mouth Expression */}
                {frogExpression === 'cheer' ? (
                  <path d="M 38 48 Q 50 62 62 48 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
                ) : frogExpression === 'blink' ? (
                  <path d="M 40 52 Q 50 48 60 52" stroke="#166534" strokeWidth="3" fill="none" strokeLinecap="round" />
                ) : (
                  <path d="M 38 48 Q 50 58 62 48" stroke="#166534" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                )}

                {/* Front Paws */}
                <ellipse cx="36" cy="68" rx="6" ry="10" fill="#16a34a" transform="rotate(-15 36 68)" />
                <ellipse cx="64" cy="68" rx="6" ry="10" fill="#16a34a" transform="rotate(15 64 68)" />
              </svg>

              {/* Water Splash Ripples when jumping */}
              {isJumping && (
                <div className="absolute -bottom-2 w-32 h-8 rounded-full border-4 border-cyan-200 animate-ping pointer-events-none" />
              )}
            </div>

            {/* Speech Bubble / Mascot Mood Tag */}
            <div className="bg-emerald-950/80 text-emerald-100 text-[11px] font-black px-3 py-1 rounded-full shadow-md mt-1 mx-auto text-center border border-emerald-400/40">
              {frogExpression === 'cheer' ? (
                <span>🎉 Kwoakkk! Benar Sekali! 🎓</span>
              ) : frogExpression === 'blink' ? (
                <span>💦 Kwoak... Tetap Semangat! 🐸</span>
              ) : currentSelectedIdx !== undefined ? (
                <span>🐸 Daun Teratai {optionLetters[currentSelectedIdx]} Terpilih!</span>
              ) : (
                <span>Lompat ke Daun Teratai Jawabanmu! 🪷</span>
              )}
            </div>
          </div>
        </div>

        {/* 4 Floating Water Lily Pads (Daun Teratai Pilihan A, B, C, D) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 my-2">
          {question.options.map((optText, idx) => {
            const isSelected = currentSelectedIdx === idx;
            const isTarget = targetPad === idx;

            return (
              <div
                key={idx}
                onClick={() => handleFrogJump(idx)}
                className={`relative group cursor-pointer p-3 sm:p-3.5 rounded-2xl border-3 transition-all duration-200 transform active:scale-95 shadow-md flex items-start gap-3 ${
                  isSelected
                    ? 'bg-linear-to-r from-emerald-100 via-teal-100 to-green-100 border-amber-400 ring-4 ring-amber-300 shadow-xl scale-102'
                    : 'bg-white/90 hover:bg-white border-emerald-300/80 hover:border-emerald-400 hover:shadow-lg'
                }`}
              >
                {/* Lily Pad Badge with Letter */}
                <div
                  className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full flex-shrink-0 flex items-center justify-center font-black text-sm sm:text-base shadow-md transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-white ring-2 ring-amber-300 animate-bounce'
                      : 'bg-emerald-600 text-white group-hover:bg-emerald-500'
                  }`}
                >
                  {optionLetters[idx]}
                </div>

                {/* Option Text & Water Lily icon */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Daun Teratai {optionLetters[idx]}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>🐸 Katak Disini</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug mt-0.5">
                    {optText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info inside pond */}
        <div className="relative z-10 flex items-center justify-between text-xs text-emerald-100 font-semibold pt-2 border-t border-emerald-300/30">
          <span>🪷 Klik daun teratai di atas untuk melompatkan Katak Filo.</span>
          {currentSelectedIdx !== undefined && (
            <span className="bg-emerald-900/60 px-2.5 py-0.5 rounded-full text-emerald-200 font-bold">
              Jawaban Tersimpan
            </span>
          )}
        </div>
      </div>

      {/* Navigation Controls Bar */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={safePrev}
          disabled={!canGoPrev}
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs flex items-center gap-1.5"
        >
          <span>⬅️</span>
          <span>Soal Sebelumnya</span>
        </button>

        <div className="text-xs font-bold text-slate-500">
          Soal <strong className="text-slate-900 font-black">{currentQNum}</strong> dari {totalQuestions}
        </div>

        {isFinalQuestion ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Trophy size={16} />
            <span>{submitting ? 'Menilai...' : 'Kirim Kuis Kodok 🐸'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={safeNext}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>Soal Selanjutnya</span>
            <span>➡️</span>
          </button>
        )}
      </div>
    </div>
  );
};
