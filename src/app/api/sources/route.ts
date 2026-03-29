import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSourceLocator(rawValue: string, type: string) {
  const value = rawValue.trim();

  if (type === "email") {
    const email = value.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return { error: "email sources must use a sender email address" };
    }
    return { value: `mailto:${email}` };
  }

  try {
    const parsed = new URL(value);
    return { value: parsed.toString() };
  } catch {
    return { error: "rss/api sources must use a valid URL" };
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("sources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }

  return NextResponse.json({ sources: data });
}

export async function POST(request: NextRequest) {
  let body: { name?: string; url?: string; type?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, url, type, tag } = body;

  if (!name || !url || !type || !tag) {
    return NextResponse.json(
      { error: "name, url, type, and tag are required" },
      { status: 400 }
    );
  }

  if (type !== "rss" && type !== "api" && type !== "email") {
    return NextResponse.json(
      { error: "type must be 'rss', 'api', or 'email'" },
      { status: 400 }
    );
  }

  const locator = normalizeSourceLocator(url, type);
  if (locator.error) {
    return NextResponse.json({ error: locator.error }, { status: 400 });
  }

  let { data, error } = await supabaseAdmin
    .from("sources")
    .insert({ name: name.trim(), url: locator.value, type, tag: tag.trim() })
    .select()
    .single();

  if (
    error &&
    type === "email" &&
    /violates check constraint "sources_type_check"/i.test(error.message)
  ) {
    ({ data, error } = await supabaseAdmin
      .from("sources")
      .insert({ name: name.trim(), url: locator.value, type: "api", tag: tag.trim() })
      .select()
      .single());
  }

  if (error) {
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }

  return NextResponse.json({ source: data }, { status: 201 });
}
