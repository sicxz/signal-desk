import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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

  if (type !== "rss" && type !== "api") {
    return NextResponse.json(
      { error: "type must be 'rss' or 'api'" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("sources")
    .insert({ name, url, type, tag })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }

  return NextResponse.json({ source: data }, { status: 201 });
}
