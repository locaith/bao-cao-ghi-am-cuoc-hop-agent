export type Priority = "High" | "Medium" | "Low";
export type Plan = "free" | "pro" | "team";

export interface MeetingTask {
  id?: string;
  title: string;
  assignee: string;
  deadline: string | null;
  priority: Priority;
  status?: "todo" | "doing" | "done";
}
export interface Recommendation {
  title: string;
  description: string;
  priority: Priority;
}

export interface Meeting {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  recommendations: Recommendation[];
  source: "text" | "audio" | "import";
  duration_seconds: number;
  created_at: string;
  tasks: MeetingTask[];
}

export interface SummaryResult {
  title: string;
  summary: string;
  key_points: string[];
  tasks: MeetingTask[];
  recommendations: Recommendation[];
  request_id: string;
  usage: { plan: string; used: number; limit: number; remaining: number };
}
