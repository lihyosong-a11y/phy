import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { unit, templates } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. Vercel 환경 변수를 확인해 주세요." },
        { status: 500 }
      );
    }

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json({ error: "템플릿 정보가 필요합니다." }, { status: 400 });
    }

    // 단원에 해당하는 템플릿 중 임의의 템플릿 1개 선택하여 문제 출제 진행
    const randomIndex = Math.floor(Math.random() * templates.length);
    const template = templates[randomIndex];

    const systemPrompt = `너는 고등학교 물리 교사이다. 교사가 학생들에게 출제할 단 하나의 새로운 물리 문제를 생성해야 한다.
주어진 템플릿의 물리 법칙(공식)을 반드시 사용하되, 지문의 '스토리(현실적인 상황)', '등장 인물', '세부 수치'를 다르고 흥미롭게 새롭게 작문하여 출제하라.

[출제 요구사항]
1. 변수 값은 템플릿의 'variable_config' 범위 내의 임의의 숫자(정수 또는 소수 첫째짜리)로 설정하라.
2. 새로 작성된 문제 텍스트('renderedText') 안에 그 수치가 분명하게 표시되어야 한다.
3. 설정한 수치들을 'answer_formula' 공식에 대입하여 실제 정답('calculatedAnswer')을 계산하라. 계산은 소수점 둘째 자리까지 정확하게 반올림해야 한다. (예: 4.6666... -> 4.67)
4. 지문은 딱딱하지 않게 스토리라인(예: 영희가 자전거를 탄다, 철수가 축구공을 찬다 등)을 입혀라.
5. 반드시 아래 JSON 형식 구조만을 반환하고, 이외의 텍스트나 설명은 생략하라.

[응답 JSON 형식]
{
  "unit": "${unit}",
  "title": "${template.title} (AI)",
  "renderedText": "(AI가 작성한 새로운 상황 지문 물리 문제)",
  "variables": { ... 사용된 변수와 값 매핑 ... },
  "calculatedAnswer": 0.00,
  "unit_symbol": "${template.unit_symbol}",
  "answer_formula": "${template.answer_formula}"
}

[참고할 문제 템플릿]
${JSON.stringify(template)}`;

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
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Teacher Question Error:", errorData);
      return NextResponse.json(
        { error: "AI 문제 출제 중 OpenAI 에러가 발생했습니다." },
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
    console.error("Teacher Generate Question Route Error:", error);
    return NextResponse.json(
      { error: "서버 처리 중 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}
