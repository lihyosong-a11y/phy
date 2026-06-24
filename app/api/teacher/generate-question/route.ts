import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. Vercel 환경 변수를 확인해 주세요." },
        { status: 500 }
      );
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "출제 요구사항을 입력해 주세요." }, { status: 400 });
    }

    const systemPrompt = `너는 고등학교 물리 교사이자 대학수학능력시험 출제위원이다.
교사가 입력한 물리 문제 출제 요구사항을 엄격하게 분석하여, 학생들에게 제공할 단 하나의 고품질 물리 문제를 새롭게 창작해 출제하라.

[교사 요구사항]
"${prompt}"

[출제 및 응답 요구사항]
1. 문제 지문('renderedText')은 물리적으로 오류가 없어야 하며, 고등학교 교육과정에 부합하는 실생활 맥락(인물, 스토리, 구체적 상황 등)과 문제 풀이에 필요한 수치를 반드시 텍스트 내에 정확히 명시하라.
2. 문제 지문에 명시된 수치들을 바탕으로, 요구사항에 알맞은 정답('calculatedAnswer')을 계산하라. 계산은 소수점 둘째 자리까지 정확하게 반올림해야 한다. (예: 9.8 / 3 -> 3.27)
3. 대단원/중단원 분류('unit', 예: 힘과 운동, 전자기, 열역학, 파동, 현대물리 등), 제목('title'), 단위 기호('unit_symbol', 예: m/s², N, A, W, V, Ω 등), 그리고 문제 풀이 공식 또는 핵심 유도식('answer_formula')을 AI가 상황에 맞춰 명확하게 추론하여 저장하라.
4. 지문 안에 들어가는 숫자들과 변수명들을 'variables' 필드에 매핑하여 제공하라.
5. 반드시 아래 JSON 형식 구조만을 반환하고, 이외의 설명이나 Markdown 서식 등은 배제하라. 반드시 JSON만 출력하라.

[응답 JSON 형식]
{
  "unit": "(유추된 단원명)",
  "title": "(출제된 문제의 명확한 제목)",
  "renderedText": "(AI가 새롭게 창작한 문제 본문 내용 지문)",
  "variables": { "mass": 5, "force": 20 }, (문제 지문에 언급한 변수명과 수치 값 매핑)
  "calculatedAnswer": 4.00, (정교하게 수학적으로 산출한 정확한 정답 수치)
  "unit_symbol": "(단위 기호)",
  "answer_formula": "(정답을 도출하는 공식 또는 계산 유도식)"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a creative physics teacher. You must return only a valid JSON object matching the requested schema." },
          { role: "user", content: systemPrompt }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Custom Teacher Question Error:", errorData);
      return NextResponse.json(
        { error: "AI 문제 생성 도중 OpenAI 에러가 응답되었습니다." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "생성된 문제 데이터가 비어 있습니다." }, { status: 500 });
    }

    const question = JSON.parse(content);
    return NextResponse.json({ question });
  } catch (error: any) {
    console.error("Teacher Generate Custom Question Route Error:", error);
    return NextResponse.json(
      { error: "서버 처리 중 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}
