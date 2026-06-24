import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { questionTitle, questionText, studentAnswer, correctAnswer, unitSymbol, answerFormula } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 서버에 설정되지 않았습니다. Vercel 환경 변수 설정을 확인하세요." },
        { status: 500 }
      );
    }

    const systemPrompt = `너는 친절하고 유능한 고등학교 물리 교사이자 AI 튜터이다.
학생이 물리 문제의 답을 틀렸으므로, 학생에게 정답을 직접적으로 가르쳐주지 않으면서 다음 정보를 활용해 문제 해결 방법을 단계별로 친절하게 안내하고 힌트를 제공하라.

[문제 정보]
- 대단원: ${questionTitle}
- 문제 내용: ${questionText}
- 학생이 제출한 답: ${studentAnswer} ${unitSymbol}
- 실제 정답 계산 공식: ${answerFormula}
- 최종 산출 정답: ${correctAnswer} ${unitSymbol}

작성 지침:
1. "정답은 X이다" 또는 "실제 정답은 X이다"처럼 최종 수치 답을 직접적으로 절대 언급하지 마라.
2. 학생의 도전을 칭찬하고, 부드럽고 친절한 존댓말(한국어)로 격려하라.
3. 주어진 수식에서 어떤 물리량이 어떤 변수인지 짚어주고, 학생이 계산 과정에서 실수했을 법한 부분(예: 단위 변환, 사칙연산 오류, 반올림 누락 등)을 스스로 점검할 수 있도록 힌트를 유도하라.
4. 설명은 3~4줄 내외로 간결하고 직관적으로 읽히도록 핵심 위주로 작성하라.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "제가 제출한 답이 틀렸는데, 어디가 틀렸는지 힌트를 주세요." }
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Error:", errorData);
      return NextResponse.json(
        { error: "AI 피드백 생성 중 OpenAI 서비스에서 에러가 응답되었습니다." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || "AI 피드백을 생성할 수 없습니다.";

    return NextResponse.json({ feedback });
  } catch (error: any) {
    console.error("Route Handler Error:", error);
    return NextResponse.json(
      { error: "서버 처리 중 예기치 못한 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
