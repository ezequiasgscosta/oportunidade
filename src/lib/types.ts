import type { User } from "@supabase/supabase-js";

export type AppPage = "home" | "admin" | "about" | "privacy" | "terms" | "contact";
export type InfoPage = Extract<AppPage, "about" | "privacy" | "terms" | "contact">;
export type TrackStatus = "pending" | "approved" | "rejected";
export type TrackFilter = TrackStatus | "all";

export type Track = {
  id: string;
  title: string;
  artist: string;
  category: string;
  location: string;
  audio_path: string;
  status: TrackStatus;
  submitted_by: string | null;
  created_at: string;
};

export type AdminMember = {
  user_id: string;
  email: string | null;
  created_at: string;
};

export type SiteSuggestion = {
  id: string;
  title: string;
  message: string;
  status: "new" | "reviewed";
  created_at: string;
};

export type DashboardStats = {
  total_users: number;
  total_tracks: number;
  approved_tracks: number;
  pending_tracks: number;
  rejected_tracks: number;
};

export type SiteVisitStat = {
  visit_date: string;
  unique_visitors: number;
  period_unique_visitors: number;
};

export type AppUser = User | null;
