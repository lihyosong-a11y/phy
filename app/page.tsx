"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Rabbit, Menu, X, ArrowRight, Sparkles, Cpu, BookOpen, Layers } from "lucide-react";

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 가짜 버튼 클릭 핸들러
  const handlePlaceholderClick = () => {
    alert("축하합니다! 기본 뼈대 앱이 성공적으로 작동하고 있습니다. 이 버튼에 새로운 시뮬레이션이나 기능을 연결해 보세요!");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* ========================================================================= */}
      {/* 1. 상단 헤더 (Header Component로 나중에 분리 가능) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* 로고 영역 */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all hover:scale-105">
              <Rabbit className="w-6 h-6 animate-pulse" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Rabbit
            </span>
          </div>

          {/* 데스크톱 네비게이션 (여기에 새로운 링크를 추가하거나 컴포넌트로 분리하세요) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">홈</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">소개</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">시뮬레이션</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">연락처</a>
          </nav>

          {/* 데스크톱 액션 버튼 */}
          <div className="hidden md:block">
            <Link 
              href="/quiz"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              퀴즈 보드 입장
            </Link>
          </div>

          {/* 모바일 햄버거 메뉴 버튼 */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="메뉴 토글"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* 모바일 네비게이션 드롭다운 */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 px-4 pt-2 pb-4 space-y-2">
            <a href="#" className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">홈</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">소개</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">시뮬레이션</a>
            <a href="#" className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">연락처</a>
            <Link 
              href="/quiz"
              className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all"
            >
              퀴즈 보드 입장
            </Link>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. 메인 화면 (Hero Section) */}
      {/* ========================================================================= */}
      <main className="flex-grow">
        
        {/* 히어로 영역 */}
        <section className="relative overflow-hidden pt-20 pb-16 lg:pt-32 lg:pb-24 flex items-center justify-center">
          {/* 배경 그라데이션 장식 데코레이션 */}
          <div className="absolute inset-0 -z-10 opacity-30 dark:opacity-20" style={{ backgroundImage: "radial-gradient(45rem 50rem at top, var(--tw-gradient-stops))" }}>
            <div className="absolute inset-0 from-indigo-100 via-indigo-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 bg-gradient-to-b" />
          </div>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-r from-indigo-300 to-violet-300 dark:from-indigo-950/20 dark:to-violet-950/20 rounded-full blur-[120px] opacity-50 -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* 뱃지 장식 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 mb-6 border border-indigo-100/50 dark:border-indigo-900/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next.js 15 & Tailwind CSS 보일러플레이트</span>
            </div>

            {/* 환영 문구 */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
              <span className="block mb-2 text-indigo-600 dark:text-indigo-400">깡총깡총</span>
              <span className="text-4xl sm:text-5xl md:text-6xl text-slate-800 dark:text-slate-100 font-bold block">
                배포 준비 완료!
              </span>
            </h1>

            {/* 본문 설명 */}
            <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
              가상 시뮬레이션을 통해 복잡한 법칙을 직관적으로 체험해 보세요.<br className="hidden sm:inline" />
              이 뼈대 코드 위에 여러분만의 시뮬레이터와 학습 콘텐츠를 자유롭게 확장할 수 있습니다.
            </p>

            {/* 기능 추가를 위한 가짜(Placeholder) 버튼 */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link
                href="/quiz"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:shadow-xl hover:shadow-indigo-300 dark:hover:shadow-none transition-all duration-200 hover:-translate-y-0.5"
              >
                <span>스마트 퀴즈 풀기</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
              >
                GitHub 저장소
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. 확장 영역: 여기에 새로운 시뮬레이션 카드나 대시보드 리스트를 추가하세요 */}
        {/* ========================================================================= */}
        <section className="py-16 bg-white dark:bg-slate-900 border-y border-slate-200/60 dark:border-slate-800/60 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">시작하기 좋은 교육 기능 예시</h2>
              <p className="text-slate-600 dark:text-slate-400">
                아래 예시처럼 나중에 추가하고 싶은 웹 콘텐츠나 컴포넌트를 자유롭게 배치해 보세요.
              </p>
            </div>

            {/* 그리드 레이아웃 (반응형: 1열 -> 2열 -> 3열) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* 기능 카드 1 */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 hover:border-indigo-500/50 hover:shadow-md transition-all">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-4">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">물리 엔진 시뮬레이터</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  진자 운동, 포물선 발사, 충돌 실험 등 직관적인 2D 물리 연산을 시뮬레이션합니다.
                </p>
                {/* 여기에 새로운 컴포넌트를 추가하거나 라우팅을 구성하세요 */}
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">// 컴포넌트 추가 가능 위치</span>
              </div>

              {/* 기능 카드 2 */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 hover:border-indigo-500/50 hover:shadow-md transition-all">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">대화형 실험 퀴즈</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  가상 실험 결과를 관찰하고, 즉석에서 정답을 맞춰보는 교육용 퀴즈 기능입니다.
                </p>
                {/* 여기에 새로운 컴포넌트를 추가하거나 라우팅을 구성하세요 */}
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">// 컴포넌트 추가 가능 위치</span>
              </div>

              {/* 기능 카드 3 */}
              <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 hover:border-indigo-500/50 hover:shadow-md transition-all">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit mb-4">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">실시간 데이터 차트</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                  실험 결과로 도출되는 수치 변화를 실시간 그래프와 대시보드로 시각화합니다.
                </p>
                {/* 여기에 새로운 컴포넌트를 추가하거나 라우팅을 구성하세요 */}
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">// 컴포넌트 추가 가능 위치</span>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ========================================================================= */}
      {/* 4. 하단 푸터 (Footer Component로 나중에 분리 가능) */}
      {/* ========================================================================= */}
      <footer className="w-full bg-slate-100 dark:bg-slate-950 py-8 border-t border-slate-200 dark:border-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Rabbit className="w-5 h-5 text-slate-400 dark:text-slate-600" />
            <span className="font-semibold text-slate-500 dark:text-slate-500 text-sm">Rabbit Project</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center md:text-left">
            {"\u00A9"} {new Date().getFullYear()} Rabbit. All rights reserved. 교육용 웹 서비스의 훌륭한 시작점.
          </p>
          <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-600">
            <a href="#" className="hover:text-indigo-600 transition-colors">이용약관</a>
            <span>{"\u2022"}</span>
            <a href="#" className="hover:text-indigo-600 transition-colors">개인정보처리방침</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
