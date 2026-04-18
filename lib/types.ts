export type MusicStyle =
  | "Lo-fi"
  | "Ambient"
  | "Classical"
  | "Jazz"
  | "Nature Sounds"
  | "Electronic Focus"
  | "Epic/Cinematic";

export type Duration = 5 | 10 | 15 | 20 | 25 | 30 | 45 | 60;

export type AppState = "input" | "loading" | "session";

export interface SessionConfig {
  task: string;
  duration: Duration;
  musicStyle: MusicStyle;
}

export interface GeneratedContent {
  image: string;
  audio: string;
}

export interface LoadingStatus {
  prompts: "pending" | "loading" | "done" | "error";
  image: "pending" | "loading" | "done" | "error";
  music: "pending" | "loading" | "done" | "error";
}
