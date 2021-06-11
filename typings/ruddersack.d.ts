declare module '@rudderstack/rudder-sdk-node' {
  class Analytics {
    constructor(writeKey: string, endpoint: string);

    public identify(userId: string, context: any): void;

    public track(userId: string, eventId: string, metadata: any): void;
  }

  export default Analytics;
}
