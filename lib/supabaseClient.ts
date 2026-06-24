import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project-id.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase URL 또는 Anon Key가 설정되지 않았습니다. 빌드 타임에는 임시 값이 제공되며, 런타임에 올바른 환경 변수가 필요합니다."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
