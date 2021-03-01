declare module '@voiceflow/verror' {
  // eslint-disable-next-line import/no-extraneous-dependencies
  import httpStatus, { HttpStatus } from 'http-status';

  class VError {
    constructor(message: string, code?: number | string, data?: any);

    static HTTP_STATUS: HttpStatus;

    public name: string;

    public code: number | string;

    public message: string;

    public data: any;

    public dateTime: Date;
  }

  export { httpStatus as HTTP_STATUS };

  export default VError;
}
