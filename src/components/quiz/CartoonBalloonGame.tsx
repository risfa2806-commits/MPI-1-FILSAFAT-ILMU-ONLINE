import React, { useState } from 'react';
import { QuizQuestion } from '../../types';
import { cartoonAudio } from '../../utils/cartoonAudio';
import { Target, Sparkles, Trophy, HelpCircle, CheckCircle2, XCircle } from 'lucide-react';

interface CartoonBalloonGameProps {
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

export const CartoonBalloonGame: React.FC<CartoonBalloonGameProps> = ({
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
  const [poppedIndex, setPoppedIndex] = useState<number | null>(null);
  const [burstParticles, setBurstParticles] = useState<{ x: number; y: number; color: string } | null>(null);

  // Safe handler resolution to avoid any "onSelectOption is not a function" errors
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

  const balloonColors = [
    {
      bg: 'from-rose-400 to-red-500',
      border: 'border-red-400',
      badge: 'bg-rose-500',
      text: 'text-rose-950',
      ring: 'ring-rose-400',
      highlight: 'from-white/50 to-transparent',
      stringColor: '#f43f5e',
      name: 'Balon A Merah Ceria',
    },
    {
      bg: 'from-sky-400 to-blue-500',
      border: 'border-blue-400',
      badge: 'bg-sky-500',
      text: 'text-sky-950',
      ring: 'ring-sky-400',
      highlight: 'from-white/50 to-transparent',
      stringColor: '#0ea5e9',
      name: 'Balon B Biru Angkasa',
    },
    {
      bg: 'from-amber-400 to-orange-500',
      border: 'border-orange-400',
      badge: 'bg-amber-500',
      text: 'text-amber-950',
      ring: 'ring-amber-400',
      highlight: 'from-white/50 to-transparent',
      stringColor: '#f59e0b',
      name: 'Balon C Kuning Matahari',
    },
    {
      bg: 'from-emerald-400 to-teal-500',
      border: 'border-emerald-400',
      badge: 'bg-emerald-500',
      text: 'text-emerald-950',
      ring: 'ring-emerald-400',
      highlight: 'from-white/50 to-transparent',
      stringColor: '#10b981',
      name: 'Balon D Hijau Hutan',
    },
  ];

  const handleShootBalloon = (idx: number, e?: React.MouseEvent) => {
    // Play balloon pop sound
    cartoonAudio.playBalloonPop();

    // Trigger visual pop animation
    setPoppedIndex(idx);

    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      setBurstParticles({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        color: balloonColors[idx].stringColor,
      });
    }

    safeSelectOption(idx);

    // Audio feedback depending on correctness
    if (idx === question.correctIndex) {
      setTimeout(() => {
        cartoonAudio.playCorrectChime();
      }, 120);
    } else {
      setTimeout(() => {
        cartoonAudio.playBoing();
      }, 120);
    }

    // Reset pop effect after animation
    setTimeout(() => {
      setPoppedIndex(null);
      setBurstParticles(null);
    }, 800);
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-4">
      {/* Sky Canvas Container */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-sky-200 via-sky-100 to-amber-50 border-3 border-sky-300 shadow-md p-4 sm:p-6 min-h-[360px] sm:min-h-[420px] flex flex-col justify-between select-none">
        
        {/* Sky Background Decorations: Cartoon Sun & Clouds */}
        <div className="absolute -top-6 -right-6 h-28 w-28 bg-yellow-300/80 rounded-full blur-xs flex items-center justify-center pointer-events-none animate-spin-slow">
          <div className="h-20 w-20 bg-amber-400 rounded-full flex items-center justify-center text-amber-900 text-xl font-black">
            ☀️
          </div>
        </div>

        <div className="absolute top-4 left-6 bg-white/70 backdrop-blur-xs px-4 py-1.5 rounded-full text-xs font-bold text-sky-800 shadow-xs pointer-events-none flex items-center gap-1.5">
          <span>☁️</span>
          <span>Tembak Balon Jawaban yang Benar!</span>
          <Target size={14} className="text-red-500 animate-pulse" />
        </div>

        {/* Question Banner in the Sky */}
        <div className="relative z-10 max-w-2xl mx-auto w-full mt-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border-2 border-amber-300 shadow-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="bg-amber-500 text-white text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wide shadow-xs">
              Soal {questionNumber} / {totalQuestions}
            </span>
            <span className="bg-sky-100 text-sky-800 text-[11px] font-bold px-3 py-0.5 rounded-full border border-sky-200">
              {question.badgeTopic || 'RPS Filsafat'}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-extrabold text-slate-800 leading-snug">
            {question.question}
          </h3>
        </div>

        {/* 4 Floating Cartoon Balloons */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-6 items-end">
          {question.options.map((optText, idx) => {
            const color = balloonColors[idx % balloonColors.length];
            const isSelected = currentSelectedIdx === idx;
            const isPopping = poppedIndex === idx;

            return (
              <div
                key={idx}
                className="flex flex-col items-center group cursor-pointer"
                onClick={(e) => handleShootBalloon(idx, e)}
              >
                {/* Floating Balloon Body */}
                <div
                  className={`relative transition-all duration-300 transform active:scale-95 ${
                    isPopping
                      ? 'scale-125 rotate-6 animate-ping'
                      : isSelected
                      ? 'scale-105 -translate-y-2'
                      : 'hover:-translate-y-3 hover:rotate-2'
                  }`}
                  style={{
                    animationDelay: `${idx * 0.2}s`,
                  }}
                >
                  {/* Balloon Oval */}
                  <div
                    className={`w-20 h-24 sm:w-24 sm:h-28 rounded-[50%_50%_50%_50%_/_60%_60%_40%_40%] bg-linear-to-tr ${
                      color.bg
                    } border-2 ${color.border} shadow-lg relative flex flex-col items-center justify-center p-2 text-white transition-shadow ${
                      isSelected ? 'ring-4 ring-amber-400 ring-offset-2 shadow-2xl' : ''
                    }`}
                  >
                    {/* Glossy highlight */}
                    <div className="absolute top-2 left-3 w-5 h-7 rounded-full bg-white/40 -rotate-35 pointer-events-none" />

                    {/* Letter badge inside balloon */}
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white text-slate-900 font-black text-sm sm:text-base flex items-center justify-center shadow-md mb-1">
                      {optionLetters[idx]}
                    </div>

                    <span className="text-[10px] font-black tracking-wider uppercase drop-shadow-xs">
                      {isSelected ? 'Terpilih! 🎯' : 'Tembak 🏹'}
                    </span>
                  </div>

                  {/* Balloon Knot */}
                  <div
                    className="w-3 h-2 mx-auto rounded-b-sm shadow-xs"
                    style={{ backgroundColor: color.stringColor }}
                  />

                  {/* Balloon String */}
                  <svg
                    className="w-6 h-8 mx-auto -mt-0.5 overflow-visible"
                    viewBox="0 0 24 32"
                    fill="none"
                  >
                    <path
                      d="M12,0 Q8,10 14,18 T12,32"
                      stroke={color.stringColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Answer Card below the balloon string */}
                <div
                  className={`w-full text-center mt-1 p-2 sm:p-2.5 rounded-xl border-2 text-xs font-bold transition-all shadow-xs ${
                    isSelected
                      ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-300 shadow-md scale-102'
                      : 'bg-white/90 hover:bg-white border-slate-200 text-slate-700 hover:border-sky-300'
                  }`}
                >
                  <p className="line-clamp-3 leading-tight">{optText}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions / Shooter Crosshair Info */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sky-200/80 text-xs text-sky-900 font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-base">🎈</span>
            <span>Klik atau sentuh salah satu balon untuk menembak jawaban Anda.</span>
          </div>
          {currentSelectedIdx !== undefined && (
            <div className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/90 px-3 py-1 rounded-full">
              <CheckCircle2 size={14} />
              <span>Jawaban {optionLetters[currentSelectedIdx]} tersimpan!</span>
            </div>
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
            <span>{submitting ? 'Menilai...' : 'Kirim Kuis Balon 🎈'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={safeNext}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>Soal Selanjutnya</span>
            <span>➡️</span>
          </button>
        )}
      </div>
    </div>
  );
};
