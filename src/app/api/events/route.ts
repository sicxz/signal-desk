import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.replace("Bearer ", "");

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("api_key", apiKey)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  let body: {
    channel?: string; title?: string; description?: string; icon?: string;
    tags?: string[]; source_id?: string; summary?: string;
    original_url?: string; content_hash?: string; topic?: string;
    section?: string; speculation_score?: number; is_promoted?: boolean;
    big_deal?: string; catch?: string; why_care?: string; image_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { channel, title, description, icon, tags, source_id, summary, original_url, content_hash, topic, section, speculation_score, is_promoted, big_deal, catch: catchField, why_care, image_url } = body;

  if (!channel || !title) {
    return NextResponse.json(
      { error: "channel and title are required" },
      { status: 400 }
    );
  }

  const { data: event, error: insertError } = await supabaseAdmin
    .from("events")
    .insert({
      project_id: project.id,
      channel,
      title,
      description: description || null,
      icon: icon || null,
      tags: tags || [],
      source_id: source_id || null,
      summary: summary || null,
      original_url: original_url || null,
      content_hash: content_hash || null,
      topic: topic || null,
      section: section || null,
      speculation_score: speculation_score ?? null,
      is_promoted: is_promoted ?? false,
      big_deal: big_deal || null,
      catch: catchField || null,
      why_care: why_care || null,
      image_url: image_url || null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to insert event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ event }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");
  const search = searchParams.get("search");

  let query = supabaseAdmin
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (channel) {
    query = query.eq("channel", channel);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }

  return NextResponse.json({ events });
}
