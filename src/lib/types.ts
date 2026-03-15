export interface Event {
  id: string;
  project_id: string;
  channel: string;
  title: string;
  description: string | null;
  icon: string | null;
  tags: string[];
  created_at: string;
  source_id: string | null;
  summary: string | null;
  original_url: string | null;
  content_hash: string | null;
  topic: string | null;
  section: string | null;
  speculation_score: number | null;
  is_promoted: boolean;
  big_deal: string | null;
  catch: string | null;
  why_care: string | null;
  image_url: string | null;
}

export interface Source {
  id: string;
  name: string;
  url: string;
  type: "rss" | "api";
  tag: string;
  active: boolean;
  created_at: string;
}
