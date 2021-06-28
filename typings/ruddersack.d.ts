declare module '@rudderstack/rudder-sdk-node' {
  class Analytics {
    constructor(writeKey?: string, endpoint?: string);

    public identify(data: IdentifyRequest): void;

    public track(data: TrackRequest): void;
  }

  export default Analytics;

  export interface IdentifyRequest {
    userId: string;
  }

  export interface TrackRequest {
    userId: string;
    event: string;
    properties: Record<string, unknown>;
  }
}
