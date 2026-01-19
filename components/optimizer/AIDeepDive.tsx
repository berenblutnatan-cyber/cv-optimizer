"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Target, 
  Award, 
  Lightbulb, 
  ChevronRight,
  Loader2,
  Check,
  MessageSquare
} from "lucide-react";

interface AIDeepDiveProps {
  onComplete: (answers: DeepDiveAnswers) => void;
  isOpen: boolean;
  onToggle: () => void;
  jobTitle?: string;
}

export interface DeepDiveAnswers {
  achievements: string;
  hiddenSkills: string;
  uniqueValue: string;
}

const QUESTIONS = [
  {
    id: "achievements",
    icon: Award,
    title: "Hidden Achievements",
    question: "What accomplishments from your career are you most proud of that might not be fully reflected in your CV? Think about: projects you led, problems you solved, metrics you improved, or recognition you received.",
    placeholder: "Example: I led a team migration to cloud that saved $200K annually, but I only mentioned 'managed cloud infrastructure' on my CV...",
    hint: "Be specific! Include numbers, team sizes, timelines, and impact."
  },
  {
    id: "hiddenSkills", 
    icon: Target,
    title: "Unlisted Skills & Tools",
    question: "What skills, tools, certifications, or technologies do you use regularly that aren't mentioned in your CV? Include soft skills like leadership, communication, or cross-functional collaboration.",
    placeholder: "Example: I'm proficient in Python, Tableau, and SQL but only listed Excel. I also led weekly stakeholder meetings and trained 5 new team members...",
    hint: "List everything! Technical tools, methodologies (Agile, Scrum), languages, certifications."
  },
  {
    id: "uniqueValue",
    icon: Lightbulb,
    title: "Your Unique Value",
    question: "What makes you different from other candidates? What's your 'superpower' or unique combination of experience that would make you perfect for this role?",
    placeholder: "Example: I bridge the gap between technical and business teams - I can code AND present to C-suite executives. I also have experience in both startups and Fortune 500...",
    hint: "Think about: unique background, rare skill combinations, industry knowledge, or perspectives."
  }
];

export function AIDeepDive({ onComplete, isOpen, onToggle, jobTitle }: AIDeepDiveProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<DeepDiveAnswers>({
    achievements: "",
    hiddenSkills: "",
    uniqueValue: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // All questions answered
      setIsSubmitting(true);
      setTimeout(() => {
        onComplete(answers);
        setIsSubmitting(false);
      }, 500);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const currentQ = QUESTIONS[currentQuestion];
  const currentAnswer = answers[currentQ.id as keyof DeepDiveAnswers];
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;
  const completedCount = Object.values(answers).filter(a => a.trim().length > 0).length;

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-full bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-dashed border-violet-200 rounded-2xl p-5 hover:border-violet-400 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                AI Career Deep Dive
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  +30% Better Results
                </span>
              </h3>
              <p className="text-sm text-slate-500">
                Answer 3 quick questions to unlock hidden potential in your CV
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-lg shadow-violet-100/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500 to-indigo-600 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">AI Career Deep Dive</h3>
              <p className="text-violet-100 text-sm">
                {jobTitle ? `Optimizing for: ${jobTitle}` : "Help us understand you better"}
              </p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="text-violet-200 hover:text-white text-sm underline"
          >
            Skip
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-2">
          {QUESTIONS.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx < currentQuestion 
                  ? "bg-white" 
                  : idx === currentQuestion 
                    ? "bg-white/80" 
                    : "bg-white/30"
              }`}
            />
          ))}
        </div>
        <p className="text-violet-200 text-xs mt-2">
          Question {currentQuestion + 1} of {QUESTIONS.length}
        </p>
      </div>

      {/* Question Card */}
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <currentQ.icon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-1">{currentQ.title}</h4>
            <p className="text-slate-600 text-sm leading-relaxed">{currentQ.question}</p>
          </div>
        </div>

        {/* Answer Textarea */}
        <div className="relative">
          <textarea
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
            placeholder={currentQ.placeholder}
            className="w-full h-32 p-4 border border-slate-200 rounded-xl text-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-300" />
            <span className="text-xs text-slate-400">
              {currentAnswer.length} chars
            </span>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-violet-600 mt-2 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" />
          {currentQ.hint}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            {/* Quick completion indicator */}
            <div className="flex items-center gap-1 mr-4">
              {QUESTIONS.map((q, idx) => (
                <div 
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    answers[q.id as keyof DeepDiveAnswers].trim() 
                      ? "bg-emerald-500" 
                      : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-violet-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : isLastQuestion ? (
                <>
                  <Check className="w-4 h-4" />
                  Complete & Enhance CV
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preview of what we'll do */}
      <div className="bg-slate-50 border-t border-slate-100 p-4">
        <p className="text-xs text-slate-500 text-center">
          🎯 Your answers will be used to: <strong>add missing skills</strong>, <strong>quantify achievements</strong>, and <strong>highlight your unique value</strong>
        </p>
      </div>
    </div>
  );
}

export default AIDeepDive;
