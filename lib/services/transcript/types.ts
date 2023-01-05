export interface TranscriptClientInfo {
  device: string;
  os: string;
  browser: string;
  user: {
    name: string;
    image: string;
  };
}

export interface TranscriptUpdatePayload {
  updatedAt: Date;
  os?: string | undefined;
  device?: string | undefined;
  browser?: string | undefined;
  user?: {
    name?: string | undefined;
    image?: string | undefined;
  };
}
