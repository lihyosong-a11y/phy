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
  GraduationCap,
  Lock,
  Unlock,
  Key,
  Sparkles,
  LogOut
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

  // 학생 로그인 상태 관리
  const [studentNumber, setStudentNumber] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [isStudentAuthenticated, setIsStudentAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // 비밀번호 변경용 상태 관리
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  // 교사용 비밀번호 입력 및 로그인 상태 관리
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(false);
  const [teacherPasswordInput, setTeacherPasswordInput] = useState("");

  // 문제 및 단원 선택 상태
  const [selectedUnit, setSelectedUnit] = useState("전체");
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 제출 결과 및 상태 기록
  const [studentAnswers, setStudentAnswers] = useState<{ [key: number]: string }>({});
  const [submissionStatus, setSubmissionStatus] = useState<{ [key: number]: { isCorrect: boolean; correctAnswer: number; submitted: number } }>({});
  const [submitting, setSubmitting] = useState<{ [key: number]: boolean }>({});

  // OpenAI AI 피드백 힌트 상태 관리
  const [aiLoading, setAiLoading] = useState<{ [key: number]: boolean }>({});
  const [aiFeedback, setAiFeedback] = useState<{ [key: number]: string }>({});

  // 교사용 제출 리스트 상태
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [refreshingTeacher, setRefreshingTeacher] = useState(false);

  // 1. 컴포넌트 로드 시 질문 데이터 수집 (Supabase에서 질문을 우선 가져오고, 없으면 오프라인 데이터 사용)
  useEffect(() => {
    fetchQuestions();
  }, []);

  // 교사 모드이고 로그인 완료 시 실시간 제출 내역 조회 및 구독(Subscription) 등록
  useEffect(() => {
    if (viewMode === "teacher" && isTeacherAuthenticated) {
      fetchSubmissions();

      // Supabase Realtime을 통한 실시간 삽입(INSERT) 감지 구독 설정
      const channel = supabase
        .channel("student-submissions-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "student_submissions"
          },
          (payload) => {
            console.log("실시간 데이터 삽입 감지:", payload.new);
            // 최신 데이터를 위쪽에 추가
            setAllSubmissions((prev) => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [viewMode, isTeacherAuthenticated]);

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
      console.error("데이터베이스 통신 오류로 폴백 데이터를 로드합니다:", e);
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

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setAllSubmissions(data);
      }
    } catch (e: any) {
      console.warn("Supabase 제출 내역 가져오기 실패, 로컬 스토리지 폴백 로드:", e.message);
      try {
        const subStr = localStorage.getItem("mock_student_submissions") || "[]";
        const submissions = JSON.parse(subStr);
        submissions.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllSubmissions(submissions);
      } catch (err) {
        console.error(err);
      }
    } finally {
      setRefreshingTeacher(false);
    }
  };

  // 2. 단원 선택 및 학생 로그인 성공 시 고유 수치 값을 난수로 생성하여 문제 세팅 (AI 생성 우선 시도, 실패 시 로컬 난수 치환 폴백)
  const generateDynamicQuestions = async (unitFilter: string, overrideQuestions?: any[]) => {
    const sourceQuestions = overrideQuestions || dbQuestions;
    const filteredTemplates = sourceQuestions.filter(
      (q) => unitFilter === "전체" || q.unit === unitFilter
    );

    if (filteredTemplates.length === 0) {
      setCurrentQuestions([]);
      return;
    }

    setLoading(true);
    setStudentAnswers({});
    setSubmissionStatus({});
    setAiFeedback({});
    setAiLoading({});

    try {
      // 1. OpenAI 기반 출제 백엔드 호출
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: filteredTemplates })
      });

      if (!res.ok) {
        throw new Error("AI 문제 생성 API 응답 실패");
      }

      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setCurrentQuestions(data.questions);
        console.log("AI 동적 출제 문제 수신 완료:", data.questions);
        setLoading(false);
        return;
      }
      throw new Error("유효하지 않은 응답 데이터 형식");
    } catch (err: any) {
      console.warn("AI 기반 문제 출제 실패, 로컬 난수 치환 폴백을 가동합니다:", err.message);
      
      // 2. 로컬 난수 치환 폴백 가동
      const generatedFallback = filteredTemplates.map((template) => {
        const variables: { [key: string]: number } = {};

        Object.keys(template.variable_config).forEach((varName) => {
          const config = template.variable_config[varName];
          const min = config.min;
          const max = config.max;
          const step = config.step || 1;

          const stepsCount = Math.floor((max - min) / step);
          const randomSteps = Math.floor(Math.random() * (stepsCount + 1));
          const val = min + randomSteps * step;

          variables[varName] = parseFloat(val.toFixed(2));
        });

        let formula = template.answer_formula;
        Object.keys(variables).forEach((varName) => {
          formula = formula.replaceAll(varName, variables[varName].toString());
        });

        let calculatedAnswer = 0;
        try {
          // eslint-disable-next-line no-eval
          calculatedAnswer = parseFloat(eval(formula).toFixed(2));
        } catch (e) {
          console.error("공식 계산 에러:", e);
        }

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

      setCurrentQuestions(generatedFallback);
    } finally {
      setLoading(false);
    }
  };

  // 학생 로그인 처리
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = studentNumber.trim();
    const cleanPassword = studentPassword.trim();

    if (!cleanNumber || !cleanPassword) {
      alert("학번과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1. Supabase에서 학번으로 사용자 조회
      const { data, error } = await supabase
        .from("student_users")
        .select("*")
        .eq("student_number", cleanNumber)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116: 결과 없음
        throw new Error(error.message);
      }

      if (!data) {
        // 2. 존재하지 않는 학번인 경우 -> 첫 로그인 회원가입 시도
        // 첫 로그인 시 초기 비밀번호는 학번이어야 함
        if (cleanPassword === cleanNumber) {
          const { error: insertError } = await supabase
            .from("student_users")
            .insert([
              {
                student_number: cleanNumber,
                password: cleanPassword,
                is_password_changed: false
              }
            ]);

          if (insertError) {
            throw new Error(insertError.message);
          }

          // 로그인 성공 및 비밀번호 즉시 변경 유도
          setIsStudentAuthenticated(true);
          setMustChangePassword(true);
          alert("최초 로그인에 성공했습니다! 안전을 위해 비밀번호를 즉시 변경해 주세요.");
        } else {
          alert("등록되지 않은 학번입니다. 최초 로그인 시 비밀번호는 학번과 동일하게 입력해야 합니다.");
        }
      } else {
        // 3. 존재하는 학번인 경우 -> 비밀번호 대조
        if (data.password === cleanPassword) {
          setIsStudentAuthenticated(true);
          if (!data.is_password_changed) {
            setMustChangePassword(true);
            alert("비밀번호 변경이 필요합니다. 새 비밀번호를 설정해 주세요.");
          } else {
            setMustChangePassword(false);
            generateDynamicQuestions(selectedUnit);
          }
        } else {
          alert("비밀번호가 올바르지 않습니다.");
        }
      }
    } catch (e: any) {
      console.warn("Supabase 로그인 중 에러가 발생하여 로컬 스토리지 기반 폴백 인증을 수행합니다:", e.message);
      
      // 로컬 스토리지 폴백 처리
      try {
        const usersStr = localStorage.getItem("mock_student_users") || "[]";
        const users = JSON.parse(usersStr);
        const matchedUser = users.find((u: any) => u.student_number === cleanNumber);

        if (!matchedUser) {
          if (cleanPassword === cleanNumber) {
            // 회원 생성
            const newUser = {
              student_number: cleanNumber,
              password: cleanPassword,
              is_password_changed: false
            };
            users.push(newUser);
            localStorage.setItem("mock_student_users", JSON.stringify(users));

            setIsStudentAuthenticated(true);
            setMustChangePassword(true);
            alert("최초 로그인에 성공했습니다! (로컬 모드) 안전을 위해 비밀번호를 즉시 변경해 주세요.");
          } else {
            alert("등록되지 않은 학번입니다. (로컬 모드) 최초 로그인 시 비밀번호는 학번과 동일해야 합니다.");
          }
        } else {
          if (matchedUser.password === cleanPassword) {
            setIsStudentAuthenticated(true);
            if (!matchedUser.is_password_changed) {
              setMustChangePassword(true);
              alert("비밀번호 변경이 필요합니다. 새 비밀번호를 설정해 주세요.");
            } else {
              setMustChangePassword(false);
              generateDynamicQuestions(selectedUnit);
            }
          } else {
            alert("비밀번호가 올바르지 않습니다.");
          }
        }
      } catch (err) {
        console.error(err);
        alert("로그인 처리 도중 시스템 에러가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 학생 비밀번호 변경 처리
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = newPassword.trim();
    const cleanConfirm = newPasswordConfirm.trim();

    if (!cleanNew || !cleanConfirm) {
      alert("새 비밀번호와 확인용 비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (cleanNew !== cleanConfirm) {
      alert("비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    if (cleanNew === studentNumber.trim()) {
      alert("보안을 위해 비밀번호는 학번과 다르게 설정해야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("student_users")
        .update({
          password: cleanNew,
          is_password_changed: true
        })
        .eq("student_number", studentNumber.trim());

      if (error) {
        throw new Error(error.message);
      }

      alert("비밀번호 변경 완료! 이제 퀴즈를 풀 수 있습니다.");
      setMustChangePassword(false);
      generateDynamicQuestions(selectedUnit);
    } catch (e: any) {
      console.warn("Supabase 비밀번호 갱신 실패, 로컬 스토리지 폴백을 진행합니다:", e.message);

      try {
        const usersStr = localStorage.getItem("mock_student_users") || "[]";
        const users = JSON.parse(usersStr);
        const idx = users.findIndex((u: any) => u.student_number === studentNumber.trim());
        if (idx !== -1) {
          users[idx].password = cleanNew;
          users[idx].is_password_changed = true;
          localStorage.setItem("mock_student_users", JSON.stringify(users));
          alert("비밀번호가 성공적으로 변경되었습니다! (로컬 저장소)");
          setMustChangePassword(false);
          generateDynamicQuestions(selectedUnit);
        } else {
          alert("비밀번호 변경 중 학번 사용자 정보를 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error(err);
        alert("비밀번호 변경 중 에러가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 학생 로그아웃
  const handleStudentLogout = () => {
    setIsStudentAuthenticated(false);
    setMustChangePassword(false);
    setStudentNumber("");
    setStudentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setStudentAnswers({});
    setSubmissionStatus({});
    setAiFeedback({});
    setAiLoading({});
  };

  // 단원 전환 시 문제 리셋 및 재생성
  const handleUnitChange = (unitName: string) => {
    setSelectedUnit(unitName);
    if (isStudentAuthenticated && !mustChangePassword) {
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

  // 3. 학생 답안 제출 및 채점 결과 저장 & OpenAI 피드백 연동
  const handleAnswerSubmit = async (q: any) => {
    const submittedVal = parseFloat(studentAnswers[q.id]);
    if (isNaN(submittedVal)) {
      alert("정답 입력란에 숫자를 입력해 주세요.");
      return;
    }

    setSubmitting((prev) => ({ ...prev, [q.id]: true }));

    // 오차 범위를 감안한 채점 (0.05 이내 정답 허용)
    const isCorrect = Math.abs(submittedVal - q.calculatedAnswer) < 0.05;

    // Supabase에 결과 저장 시도
    try {
      const { error } = await supabase.from("student_submissions").insert([
        {
          student_number: studentNumber.trim(),
          unit: q.unit,
          question_id: q.id,
          variables: q.variables,
          submitted_answer: submittedVal,
          correct_answer: q.calculatedAnswer,
          is_correct: isCorrect
        }
      ]);

      if (error) {
        throw new Error(error.message);
      }
    } catch (e: any) {
      console.warn("Supabase 제출 저장 실패, 로컬 스토리지에 결과 기록:", e.message);

      try {
        const subStr = localStorage.getItem("mock_student_submissions") || "[]";
        const submissions = JSON.parse(subStr);
        submissions.push({
          id: Math.random().toString(36).substr(2, 9),
          student_number: studentNumber.trim(),
          unit: q.unit,
          question_id: q.id,
          variables: q.variables,
          submitted_answer: submittedVal,
          correct_answer: q.calculatedAnswer,
          is_correct: isCorrect,
          created_at: new Date().toISOString()
        });
        localStorage.setItem("mock_student_submissions", JSON.stringify(submissions));
      } catch (err) {
        console.error("로컬 스토리지 저장 에러:", err);
      }
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

    // 오답일 경우 OpenAI API Route 호출로 힌트 가져오기
    if (!isCorrect) {
      setAiLoading((prev) => ({ ...prev, [q.id]: true }));
      try {
        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            questionTitle: q.title,
            questionText: q.renderedText,
            studentAnswer: submittedVal,
            correctAnswer: q.calculatedAnswer,
            unitSymbol: q.unit_symbol,
            answerFormula: q.answer_formula
          })
        });

        const data = await res.json();
        if (res.ok && data.feedback) {
          setAiFeedback((prev) => ({ ...prev, [q.id]: data.feedback }));
        } else {
          setAiFeedback((prev) => ({
            ...prev,
            [q.id]: "힌트를 생성하는 데 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          }));
        }
      } catch (err) {
        console.error("피드백 통신 실패:", err);
        setAiFeedback((prev) => ({
          ...prev,
          [q.id]: "네트워크 연결 불안정으로 AI 피드백을 불러오지 못했습니다."
        }));
      } finally {
        setAiLoading((prev) => ({ ...prev, [q.id]: false }));
      }
    }
  };

  // 교사 로그인 확인
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherPasswordInput === "012345") {
      setIsTeacherAuthenticated(true);
      setTeacherPasswordInput("");
    } else {
      alert("비밀번호가 올바르지 않습니다.");
    }
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

        {/* 교사/학생 모드 토글 버튼 */}
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
          
          {/* ① 학생 로그인 전 상태 */}
          {!isStudentAuthenticated ? (
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl transition-all">
              <div className="text-center mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mx-auto mb-3">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">학생 로그인</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  학번을 이용해 로그인합니다.<br />
                  (최초 비밀번호는 학번과 동일합니다)
                </p>
              </div>

              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    학번 (아이디)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 30101"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 입력"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>로그인 및 퀴즈 시작</span>
                  )}
                </button>
              </form>
            </div>
          ) : mustChangePassword ? (
            
            // ② 로그인 성공했으나 비밀번호 변경 전인 상태
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl transition-all">
              <div className="text-center mb-6">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl w-fit mx-auto mb-3">
                  <Key className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">비밀번호 설정 변경</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  안전한 학급 평가 환경을 위해 첫 로그인 시 비밀번호를 필히 변경하셔야 합니다.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    새 비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="새로운 비밀번호 입력"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    새 비밀번호 확인
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="새로운 비밀번호 재입력"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>비밀번호 변경 완료</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            
            // ③ 로그인 및 비밀번호 변경이 모두 완료된 상태 (문제 보드 노출)
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* 왼쪽 사이드바: 내 정보 및 단원 필터 */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* 내 프로필 정보 */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">
                    학생 프로필
                  </span>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-1.5">
                    {studentNumber} 학번
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">이름 제외 완료</p>
                  
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">데이터베이스 연동</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium">
                      <Database className="w-3 h-3" />
                      실시간
                    </span>
                  </div>

                  <button
                    onClick={handleStudentLogout}
                    className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>로그아웃</span>
                  </button>
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

                {/* 수치 재생성 버튼 */}
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

                        {/* 문제 본문 */}
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 mb-6 font-medium text-base">
                          {q.renderedText}
                        </p>

                        {/* 제출 양식 */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-grow">
                            <input
                              type="number"
                              step="any"
                              disabled={status !== undefined}
                              placeholder={status ? "제출 완료" : "답안 입력 (소수 둘째 자리 반올림)"}
                              value={answerInput}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-full pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
                            />
                            <span className="absolute right-4 top-3 text-slate-500 dark:text-slate-400 font-semibold text-sm">
                              {q.unit_symbol}
                            </span>
                          </div>

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

                        {/* 피드백 설명 및 AI 힌트 영역 */}
                        {status && (
                          <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-900 space-y-2">
                            <p>📝 내가 제출한 답: <strong className="text-slate-700 dark:text-slate-300">{status.submitted} {q.unit_symbol}</strong></p>
                            <p>🎯 계산된 실제 정답: <strong className="text-indigo-600 dark:text-indigo-400">{status.correctAnswer} {q.unit_symbol}</strong></p>
                            
                            {!status.isCorrect && (
                              <>
                                <p className="text-rose-500/80 font-medium">* 시스템 힌트: 문제 수치들을 공식({q.answer_formula})에 대입해 보세요.</p>
                                
                                {/* AI 피드백 튜터 공간 */}
                                {aiLoading[q.id] && (
                                  <div className="mt-3 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/20 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
                                    <span className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                                      AI 물리 튜터가 문제 오답 힌트를 분석하는 중입니다...
                                    </span>
                                  </div>
                                )}

                                {aiFeedback[q.id] && (
                                  <div className="mt-3 p-4 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/10">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                                        AI TUTOR HINT
                                      </span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-xs whitespace-pre-line font-medium">
                                      {aiFeedback[q.id]}
                                    </p>
                                  </div>
                                )}
                              </>
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
          
          {/* ① 교사 비밀번호 검증 미완료 상태 */}
          {!isTeacherAuthenticated ? (
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl transition-all">
              <div className="text-center mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl w-fit mx-auto mb-3">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">교사용 실시간 현황 접근</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  비밀번호를 입력하여 관리 권한을 활성화합니다.
                </p>
              </div>

              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    교사용 비밀번호 (012345)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 입력"
                    value={teacherPasswordInput}
                    onChange={(e) => setTeacherPasswordInput(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all"
                >
                  확인
                </button>
              </form>
            </div>
          ) : (
            
            // ② 교사용 비밀번호 검증 완료 상태
            <>
              {/* 통계 요약 */}
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
                      실시간 동기화 상태
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-600 font-bold">LIVE</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={fetchSubmissions}
                      disabled={refreshingTeacher}
                      className="flex-grow py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingTeacher ? "animate-spin" : ""}`} />
                      <span>새로고침</span>
                    </button>
                    <button
                      onClick={() => setIsTeacherAuthenticated(false)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center transition-all outline-none"
                      title="교사용 모드 로그아웃"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* 학생 제출 상세 기록 표 */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">학생 실시간 풀이 내역 (실시간 수신 대기 중)</h3>
                  <span className="text-xs text-slate-400">최신순 정렬</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/20">
                        <th className="px-4 py-3 font-semibold">학번</th>
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
                          <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                            제출된 기록이 아직 없습니다. 학생들이 퀴즈를 풀면 실시간으로 여기에 누적됩니다!
                          </td>
                        </tr>
                      ) : (
                        allSubmissions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                            <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{sub.student_number}</td>
                            <td className="px-4 py-4 text-xs font-semibold">{sub.unit}</td>
                            <td className="px-4 py-4 font-mono text-xs text-slate-500">
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
            </>
          )}

        </div>
      )}

    </div>
  );
}
