import { NextResponse } from "next/server";
import translate from "google-translate-api-x";

interface TranslateBody {
  texts: string[];
  to: string; // any language code: "en", "he", "fr", "ar", etc.
}

// POST /api/translate — translate an array of strings (any language → any language)
export async function POST(request: Request) {
  try {
    const body: TranslateBody = await request.json();
    if (!body.texts?.length || !body.to) {
      return NextResponse.json({ error: "texts[] and to are required" }, { status: 400 });
    }

    // google-translate-api-x supports batch translation via array
    const validTexts = body.texts.map((t) => t?.trim() || "");

    // Translate all at once for speed
    try {
      const res: any = await translate(validTexts, { to: body.to });
      const translations: string[] = Array.isArray(res)
        ? res.map((r: any) => r.text)
        : [res.text];

      return NextResponse.json({ translations });
    } catch {
      // Fallback: return originals
      return NextResponse.json({ translations: body.texts });
    }
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
