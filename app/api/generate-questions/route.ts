import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { templates } = await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API 키가 설정되지 않았습니다. 로컬 난수 치환 폴백으로 자동 대체됩니다." },
        { status: 500 }
      );
    }

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return NextResponse.json({ error: "템플릿 정보가 누락되었습니다." }, { status: 400 });
    }

    const systemPrompt = `너는 고등학교 물리 교사이자 문제 출제위원이다.
전달받은 물리 문제 템플릿 목록의 개념과 물리 공식은 반드시 그대로 활용하되, 문제의 '스토리(상황)', '등장 인물', '세부 수치'를 매번 다르고 독창적인 한글 문제로 창작하여 출제하라.

[출제 요구사항]
1. 각 문제의 무작위 값(수치)은 각 템플릿의 'variable_config' 범위(min, max, step) 내에서 임의로 결정해야 한다.
2. 새로 작성된 문제 텍스트('renderedText') 안에 그 수치가 분명하게 명시되어야 한다.
3. 결정한 수치를 템플릿의 'answer_formula' 공식에 대입하여 실제 정답('calculatedAnswer')을 계산하라. 계산은 소수점 둘째 자리까지 정확하게 반올림하여 계산해야 한다. (예: 2.333333... -> 2.33)
4. 지문은 딱딱하지 않고 다양한 실생활 상황(예: 놀이공원, 축구장, 빗길 운전, 전구 연결 등)을 묘사하여 학생들이 흥미롭게 풀 수 있게 하라.
5. 반드시 아래 JSON 형식 구조만을 반환하고, 이외의 설명이나 Markdown 서식(예: \`\`\`json)은 포함하지 마라. 반드시 JSON만 출력하라.

[응답 JSON 스키마]
{
  "questions": [
    {
      "id": 1, (템플릿 고유 ID)
      "unit": "(대단원 분류)",
      "title": "(문제 제목)",
      "renderedText": "(AI가 작성한 상황 기반 물리 문제 본문)",
      "variables": { "mass": 5, "force": 20 }, (문제에 주입한 변수명과 수치 값 매핑)
      "calculatedAnswer": 4.00, (공식으로 정교하게 계산한 정답 수치)
      "unit_symbol": "(단위 기호)",
      "answer_formula": "(공식 텍스트)"
    }
  ]
}

[템플릿 목록]
${JSON.stringify(templates)}`;

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
          { role: "system", content: "You are a helpful physics test generator. You must return a valid JSON object matching the requested schema." },
          { role: "user", content: systemPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API Question Generator Error:", errorData);
      return NextResponse.json(
        { error: "AI 문제 출제 중 OpenAI 서비스에서 에러를 반환했습니다." },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "생성된 문제 데이터가 비어 있습니다." }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: "형식이 올바르지 않은 JSON 데이터입니다." }, { status: 500 });
    }

    return NextResponse.json({ questions: parsed.questions });
  } catch (error: any) {
    console.error("Generate Questions Route Error:", error);
    return NextResponse.json(
      { error: "서버 내부 처리 중 오류가 발생했습니다: " + error.message },
      { status: 500 }
    );
  }
}
