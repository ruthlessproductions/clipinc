export type AspectRatio = "9:16" | "1:1" | "16:9";

export type SocialPlatform = "tiktok" | "youtube" | "instagram" | "twitter";

export type ProcessingStep =
  | "uploading"
  | "transcribing"
  | "analyzing"
  | "generating"
  | "complete";

export type ClipStatus = "processing" | "ready" | "exported" | "published";

export interface Clip {
  id: string;
  projectId: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  aspectRatio: AspectRatio;
  status: ClipStatus;
  score: number;
  captions: Caption[];
  thumbnail: string;
  publishedTo: SocialPlatform[];
  createdAt: string;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface Project {
  id: string;
  title: string;
  sourceUrl?: string;
  fileName?: string;
  duration: number;
  processingStep: ProcessingStep;
  processingProgress: number;
  clips: Clip[];
  createdAt: string;
}

export interface SocialAccount {
  platform: SocialPlatform;
  connected: boolean;
  username?: string;
  avatar?: string;
}
