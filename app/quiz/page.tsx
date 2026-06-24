"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  BookOpen, 
  User, 
  Send, 
  CheckCircle, 
  XCircle, 
  Database, 
  RefreshCw, 
  Award, 
  Users, 
  Check, 
  GraduationCap 
} from "lucide-react";

// Supabase가 연결되지 않았을 때 작동할 로컬 오프라인 문제 폴백(Fallback) 데이터
const OFFLINE_QUESTIONS = [
  {
    id: 1,
    unit: "힘과 운동",
    title: "뉴턴 제2법칙 (가속도 구하기)",
    template_text: "마찰이 없는 수평면 위에 놓인 질량 {mass} kg의 물체에 {force} N의 일정한 힘을 수평 방향으로 가했습니다. 이때 물체의 가속도의 크기는 얼마인가요?",
    variable_config: { mass: { min: 2, max: 10, step: 1 }, force: { min: 10, max: 50, step: 5 } },
    answer_formula: "force / mass",
    unit_symbol: "m/s²"
  },
  {
    id: 2,
    unit: "힘과 운동",
    title: "운동량과 충격량",
    template_text: "질량 {mass} kg인 축구공이 {velocity_1} m/s의 속도로 날아가다가 발에 맞고 반대 방향으로 {velocity_2} m/s의 속도로 튕겨 나갔습니다. 이때 발이 축구공에 가한 충격량의 크기는 얼마인가요?",
    variable_config: { mass: { min: 0.4, max: 0.8, step: 0.1 }, velocity_1: { min: 10, max: 20, step: 2 }, velocity_2: { min: 15, max: 25, step: 1 } },
    answer_formula: "mass * (velocity_1 + velocity_2)",
    unit_symbol: "N·s"
  },
  {
    id: 3,
    unit: "전자기",
    title: "옴의 법칙 (전류 구하기)",
    template_text: "저항이 {resistance} Ω인 전구에 {voltage} V의 전압을 걸었을 때, 전선에 흐르는 전류의 세기는 몇 A인가요?",
    variable_config: { resistance: { min: 5, max: 20, step: 5 }, voltage: { min: 10, max: 100, step: 10 } },
    answer_formula: "voltage / resistance",
    unit_symbol: "A"
  },
  {
    id: 4,
    unit: "전자기",
    title: "소비 전력 계산",
    "{voltage} V의 전원에 연결하여 {current} A의 전류가 흐르는 가전제품의 소비 전력은 몇 W인가요?": "",
    template_text: "{voltage} V의 전원에 연결하여 {current} A의 전류가 흐르는 가전제품의 소비 전력은 몇 W인가요?",
    variable_config: { voltage: { min: 110, max: 220, step: 110 }, current: { min: 2, max: 10, step: 1 } },
    answer_formula: "voltage * current",
    unit_symbol: "W"
  }
];

// 단원 리스트 정의
const UNITS = ["전체", "힘과 운동", "전자기"];

export default function QuizPage() {
  // 모드 설정 ('student' = 학생 문제 풀이, 'teacher' = 교사 결과 모니터링)
  const [viewMode, setViewMode] = useState<"student" | "teacher">("student");

  // 학생 정보 상태
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  // 문제 및 단원 선택 상태
  const [selectedUnit, setSelectedUnit] = useState("전체");
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 제출 결과 및 상태 기록
  const [studentAnswers, setStudentAnswers] = useState<{ [key: number]: string }>({});
  const [submissionStatus, setSubmissionStatus] = useState<{ [key: number]: { isCorrect: boolean; correctAnswer: number; submitted: number } }>({});
  const [submitting, setSubmitting] = useState<{ [key: number]: boolean }>({});

  // 교사용 제출 리스트 상태
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [refreshingTeacher, setRefreshingTeacher] = useState(false);

  // 1. 컴포넌트 로드 시 질문 데이터 수집 (Supabase에서 질문을 우선 가져오고, 없으면 오프라인 데이터 사용)
  useEffect(() => {
    fetchQuestions();
  }, []);

  // 교사 모드 전환 시 실시간 제출 내역 조회
  useEffect(() => {
    if (viewMode === "teacher") {
      fetchSubmissions();
    }
  }, [viewMode]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("id", { ascending: true });

      if (error || !data || data.length === 0) {
        console.log("Supabase 연결 실패 혹은 테이블이 비어 있어 오프라인 폴백 데이터를 사용합니다.");
        setDbQuestions(OFFLINE_QUESTIONS);
      } else {
        setDbQuestions(data);
      }
    } catch (e) {
      console.error(e);
      setDbQuestions(OFFLINE_QUESTIONS);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    setRefreshingTeacher(true);
    try {
      const { data, error } = await supabase
        .from("student_submissions")
        .select(`
          id,
          student_name,
          student_number,
          unit,
          variables,
          submitted_answer,
          correct_answer,
          is_correct,
          created_at,
          question_id
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAllSubmissions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingTeacher(false);
    }
  };

  // 2. 단원 선택 및 학생 입장 완료 시 고유 수치 값(질량, 힘 등)을 난수로 생성하여 문제 세팅
  // (학생마다 문제가 달라지도록 이름+학번 혹은 랜덤 시드를 결합해 값을 할당합니다.)
  const generateDynamicQuestions = (unitFilter: string) => {
    const filteredTemplates = dbQuestions.filter(
      (q) => unitFilter === "전체" || q.unit === unitFilter
    );

    const generated = filteredTemplates.map((template) => {
      const variables: { [key: string]: number } = {};

      // 설정된 범위 내에서 무작위 값 추출 (학생마다 달라지도록 설정)
      Object.keys(template.variable_config).forEach((varName) => {
        const config = template.variable_config[varName];
        const min = config.min;
        const max = config.max;
        const step = config.step || 1;

        // 랜덤 수치 계산
        const stepsCount = Math.floor((max - min) / step);
        const randomSteps = Math.floor(Math.random() * (stepsCount + 1));
        const val = min + randomSteps * step;

        // 부동 소수점 자릿수 정밀도 맞추기 (소수점 첫째 또는 둘째짜리 처리)
        variables[varName] = parseFloat(val.toFixed(2));
      });

      // 자바스크립트 수식 문자열(answer_formula)을 분석해 정답 실시간 계산
      let formula = template.answer_formula;
      Object.keys(variables).forEach((varName) => {
        formula = formula.replaceAll(varName, variables[varName].toString());
      });

      let calculatedAnswer = 0;
      try {
        // 사칙연산 계산 수식 파싱
        // eslint-disable-next-line no-eval
        calculatedAnswer = parseFloat(eval(formula).toFixed(2));
      } catch (e) {
        console.error("공식 계산 에러:", e);
      }

      // 템플릿 문장의 {변수명} 자리에 계산된 고유한 변수 수치값을 치환하여 최종 문제 텍스트 생성
      let renderedText = template.template_text;
      Object.keys(variables).forEach((varName) => {
        renderedText = renderedText.replace(`{${varName}}`, variables[varName].toString());
      });

      return {
        ...template,
        renderedText,
        variables,
        calculatedAnswer
      };
    });

    setCurrentQuestions(generated);
    // 상태 초기화
    setStudentAnswers({});
    setSubmissionStatus({});
  };

  // 학생 가입/입장
  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentNumber.trim()) {
      alert("이름과 학번을 모두 올바르게 입력해 주세요.");
      return;
    }
    setIsJoined(true);
    generateDynamicQuestions(selectedUnit);
  };

  // 단원 전환 시 문제 리셋 및 재생성
  const handleUnitChange = (unitName: string) => {
    setSelectedUnit(unitName);
    if (isJoined) {
      generateDynamicQuestions(unitName);
    }
  };

  // 학생 답안 기입 핸들러
  const handleAnswerChange = (qId: number, val: string) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [qId]: val
    }));
  };

  // 3. 학생 답안 제출 및 채점 결과 Supabase 저장 로직
  const handleAnswerSubmit = async (q: any) => {
    const submittedVal = parseFloat(studentAnswers[q.id]);
    if (isNaN(submittedVal)) {
      alert("정답 입력란에 숫자를 입력해 주세요.");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [q.id]: true }));

    // 오차 범위를 감안한 채점 (소수점 계산을 고려하여 소수점 둘째 자리까지 반올림 후 일치 비교)
    const isCorrect = Math.abs(submittedVal - q.calculatedAnswer) < 0.05;

    // Supabase student_submissions 테이블에 저장 시도
    try {
      const { error } = await supabase.from("student_submissions").insert([
        {
          student_name: studentName,
          student_number: studentNumber,
          unit: q.unit,
          question_id: q.id,
          variables: q.variables,
          submitted_answer: submittedVal,
          correct_answer: q.calculatedAnswer,
          is_correct: isCorrect
        }
      ]);

      if (error) {
        console.warn("결과가 데이터베이스에 저장되지 않았습니다. (테이블 미생성 또는 연결 설정 필요)", error.message);
      }
    } catch (e) {
      console.error("데이터베이스 저장 과정 오류:", e);
    }

    // 결과 상태 업데이트
    setSubmissionStatus((prev) => ({
      ...prev,
      [q.id]: {
        isCorrect,
        correctAnswer: q.calculatedAnswer,
        submitted: submittedVal
      }
    }));
    setSubmitting((prev) => ({ ...prev, [q.id]: false }));
  };

  // 전체 다시 풀기 (수치 재정렬)
  const handleRegenerate = () => {
    generateDynamicQuestions(selectedUnit);
  };

  return (
    <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* 타이틀 및 모드 토글 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            단원별 맞춤형 스마트 퀴즈
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            학생마다 다르게 주어지는 수치 문제를 해결하고 실시간 데이터베이스에 제출해 보세요.
          </p>
        </div>

        {/* 교사/학생 모드 토글 버튼 (여기에 새로운 컴포넌트를 추가하여 고도화 가능) */}
        <div className="inline-flex p-1 bg-slate-200 dark:bg-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setViewMode("student")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              viewMode === "student"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            학생용 풀이 보드
          </button>
          <button
            onClick={() => setViewMode("teacher")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              viewMode === "teacher"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800"
            }`}
          >
            교사용 실시간 현황
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [모드 A] 학생용 문제 풀이 화면 */}
      {/* ========================================================================= */}
      {viewMode === "student" && (
        <div className="space-y-6">
          
          {/* ① 학생 정보 등록 (미로그인 상태) */}
          {!isJoined ? (
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl transition-all">
              <div className="text-center mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mx-auto mb-3">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">학생 정보 기입</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  문제를 제공하기 전에 학번과 이름을 알려주세요.
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    학번 (예: 30101)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="5자리 학번 입력"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="이름 입력"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-lg transition-all"
                >
                  퀴즈 시작하기
                </button>
              </form>
            </div>
          ) : (
            
            // ② 로그인 완료 상태 (문제 목록 보드)
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* 왼쪽 사이드바: 내 정보 및 단원 필터 */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* 내 프로필 정보 */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">
                    학생 프로필
                  </span>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-1.5">
                    {studentName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{studentNumber} 학번</p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">데이터베이스 연동</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Database className="w-3 h-3" />
                      실시간
                    </span>
                  </div>
                </div>

                {/* 단원 선택 메뉴 */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-3">
                    학습 단원 선택
                  </span>
                  <div className="flex flex-col gap-2">
                    {UNITS.map((unit) => (
                      <button
                        key={unit}
                        onClick={() => handleUnitChange(unit)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          selectedUnit === unit
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {unit === "전체" ? "📚 전체 단원" : `📁 ${unit}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 수치 재생성 버튼 (학생별로 수치를 즉시 다시 뽑습니다) */}
                <button
                  onClick={handleRegenerate}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>새로운 수치로 문제 교체</span>
                </button>
              </div>

              {/* 오른쪽 메인: 출제된 고유 문제 목록 */}
              <div className="lg:col-span-3 space-y-6">
                
                {loading ? (
                  <div className="p-16 text-center text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                    문제를 불러오는 중입니다...
                  </div>
                ) : currentQuestions.length === 0 ? (
                  <div className="p-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                    선택한 단원에 출제된 문제가 없습니다.
                  </div>
                ) : (
                  currentQuestions.map((q) => {
                    const status = submissionStatus[q.id];
                    const answerInput = studentAnswers[q.id] || "";
                    const isSubmitting = submitting[q.id];

                    return (
                      <div
                        key={q.id}
                        className={`p-8 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
                          status
                            ? status.isCorrect
                              ? "border-emerald-500/30 bg-emerald-50/10 dark:bg-emerald-950/5"
                              : "border-rose-500/30 bg-rose-50/10 dark:bg-rose-950/5"
                            : "border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {/* 헤더 정보 */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">
                            {q.unit}
                          </span>
                          <span className="text-xs text-slate-400">문제 고유번호: #{q.id}</span>
                        </div>

                        {/* 문제 제목 */}
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                          {q.title}
                        </h4>

                        {/* 문제 본문 (치환된 수치가 표시됩니다) */}
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 mb-6 font-medium text-base">
                          {q.renderedText}
                        </p>

                        {/* 제출양식 영역 (여기에 시뮬레이션 인터페이스 추가 가능) */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          
                          {/* 답변 입력란 */}
                          <div className="relative flex-grow">
                            <input
                              type="number"
                              step="any"
                              disabled={status !== undefined}
                              placeholder={status ? "제출 완료" : "답안 입력 (소수점은 둘째 자리까지 반올림)"}
                              value={answerInput}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
                            />
                            <span className="absolute right-4 top-3 text-slate-500 dark:text-slate-400 font-semibold text-sm">
                              {q.unit_symbol}
                            </span>
                          </div>

                          {/* 제출 버튼 */}
                          {status === undefined ? (
                            <button
                              onClick={() => handleAnswerSubmit(q)}
                              disabled={isSubmitting || !answerInput}
                              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none"
                            >
                              {isSubmitting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              <span>채점 및 저장</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {status.isCorrect ? (
                                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  정답!
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 font-bold text-sm">
                                  <XCircle className="w-4 h-4" />
                                  오답
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 피드백 및 설명 영역 */}
                        {status && (
                          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-900 space-y-1">
                            <p>📝 내가 제출한 답: <strong className="text-slate-700 dark:text-slate-300">{status.submitted} {q.unit_symbol}</strong></p>
                            <p>🎯 계산된 실제 정답: <strong className="text-indigo-600 dark:text-indigo-400">{status.correctAnswer} {q.unit_symbol}</strong></p>
                            {!status.isCorrect && (
                              <p className="text-rose-500/80 font-medium">* 힌트: 문제 속 무작위 수치를 공식({q.answer_formula})에 맞게 대입하여 소수 둘째 자리까지 정교하게 풀어보세요.</p>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })
                )}

              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* [모드 B] 교사용 실시간 제출 대시보드 화면 */}
      {/* ========================================================================= */}
      {viewMode === "teacher" && (
        <div className="space-y-6">
          
          {/* ① 통계 요약 (교사용 대시보드 메인 카드) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 총 제출 개수 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                  총 답변 제출
                </span>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {allSubmissions.length} 건
                </span>
              </div>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* 정답률 계산 */}
            {(() => {
              const total = allSubmissions.length;
              const corrects = allSubmissions.filter((s) => s.is_correct).length;
              const correctRate = total > 0 ? Math.round((corrects / total) * 100) : 0;

              return (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                      평균 정답률
                    </span>
                    <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      {correctRate}%
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              );
            })()}

            {/* DB 동기화 제어 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  데이터베이스 동기화
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <button
                onClick={fetchSubmissions}
                disabled={refreshingTeacher}
                className="mt-4 w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingTeacher ? "animate-spin" : ""}`} />
                <span>데이터 수동 새로고침</span>
              </button>
            </div>

          </div>

          {/* ② 학생 제출 상세 기록 표(Table) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">학생 실시간 풀이 내역</h3>
              <span className="text-xs text-slate-400">최신순으로 나열됩니다.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                    <th className="px-4 py-3 font-semibold">학번</th>
                    <th className="px-4 py-3 font-semibold">이름</th>
                    <th className="px-4 py-3 font-semibold">단원</th>
                    <th className="px-4 py-3 font-semibold">출제된 수치</th>
                    <th className="px-4 py-3 font-semibold">제출 답안</th>
                    <th className="px-4 py-3 font-semibold">실제 정답</th>
                    <th className="px-4 py-3 font-semibold">채점</th>
                    <th className="px-4 py-3 font-semibold text-right">제출 시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {allSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                        제출된 기록이 아직 없습니다. 학생들이 퀴즈를 풀면 실시간으로 여기에 누적됩니다!
                      </td>
                    </tr>
                  ) : (
                    allSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                        <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{sub.student_number}</td>
                        <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{sub.student_name}</td>
                        <td className="px-4 py-4 text-xs font-semibold">{sub.unit}</td>
                        <td className="px-4 py-4 font-mono text-xs">
                          {Object.keys(sub.variables).map((k) => `${k}: ${sub.variables[k]}`).join(", ")}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{sub.submitted_answer}</td>
                        <td className="px-4 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{sub.correct_answer}</td>
                        <td className="px-4 py-4">
                          {sub.is_correct ? (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                              <Check className="w-3.5 h-3.5" />
                              정답
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold text-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              오답
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-xs text-slate-400">
                          {new Date(sub.created_at).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
