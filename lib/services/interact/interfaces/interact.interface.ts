export interface InteractRequest {
  projectID: string;
  versionID: string;
  userID: string;
  sessionID: string;
  action: any;
  state?: any;
}
