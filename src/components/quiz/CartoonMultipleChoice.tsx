import React from 'react';
import { QuizQuestion } from '../../types';
import { cartoonAudio } from '../../utils/cartoonAudio';
import { Trophy, CheckCircle2, Award } from 'lucide-react';

interface CartoonMultipleChoiceProps {
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

export const CartoonMultipleChoice: React.FC<CartoonMultipleChoiceProps> = ({
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
  const optionLetters = ['A', 'B', 'C', 'D'];

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

  const handleChoose = (idx: number) => {
    cartoonAudio.playBoing();
    safeSelectOption(idx);
    if (idx === question.correctIndex) {
      setTimeout(() => cartoonAudio.playCorrectChime(), 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cartoon Card Board */}
      <div className="bg-linear-to-b from-amber-50 via-white to-amber-50/50 border-3 border-amber-300 rounded-3xl p-5 sm:p-7 shadow-lg select-none">
        
        {/* Question Header & Mascot Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 mb-4 border-b-2 border-amber-100">
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide shadow-xs">
              Soal {currentQNum} / {totalQuestions}
            </span>
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-3 py-1 rounded-full border border-sky-200">
              {question.badgeTopic || 'Filsafat Ilmu'}
            </span>
          </div>

          <div className="text-xs font-black text-amber-900 flex items-center gap-1.5 bg-amber-100/80 px-3 py-1 rounded-full">
            <Award size={14} className="text-amber-600" />
            <span>Bobot: {question.points} Poin</span>
          </div>
        </div>

        {/* Question Text */}
        <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-relaxed mb-6">
          {question.question}
        </h3>

        {/* 4 Cartoon Option Buttons */}
        <div className="grid grid-cols-1 gap-3.5">
          {question.options.map((optionText, idx) => {
            const isSelected = currentSelectedIdx === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleChoose(idx)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-3.5 group cursor-pointer shadow-xs active:scale-98 ${
                  isSelected
                    ? 'bg-amber-100 border-amber-500 text-amber-950 ring-3 ring-amber-300 shadow-md translate-x-1'
                    : 'bg-white hover:bg-amber-50/60 border-slate-200 hover:border-amber-300 text-slate-700'
                }`}
              >
                {/* Letter Circle */}
                <div
                  className={`h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm shadow-xs transition-colors ${
                    isSelected
                      ? 'bg-amber-500 text-white animate-bounce'
                      : 'bg-slate-100 text-slate-700 group-hover:bg-amber-200 group-hover:text-amber-900'
                  }`}
                >
                  {optionLetters[idx]}
                </div>

                {/* Option Content */}
                <div className="flex-1">
                  <div className="text-xs sm:text-sm font-bold leading-normal">
                    {optionText}
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
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
            <span>{submitting ? 'Menilai...' : 'Kirim Jawaban Kuis 🎯'}</span>
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
