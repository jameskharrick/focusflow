export type MusicStyle =
  | "Lo-fi"
  | "Ambient"
  | "Classical"
  | "Jazz"
  | "Nature Sounds"
  | "Electronic Focus"
  | "Epic/Cinematic";

// null = indefinite session
export type Duration = number | null;

export type AppState = "input" | "loading" | "session";

export interface SessionConfig {
  task: string;
  duration: Duration;
  musicStyle: MusicStyle;
}

export interface GeneratedContent {
  videoId: string;
  videoTitle: string;
  videoChannel: string;
}

export interface LoadingStatus {
  prompts: "pending" | "loading" | "done" | "error";
  music: "pending" | "loading" | "done" | "error";
}
