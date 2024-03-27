// tracer.ts
import tracer from 'dd-trace';

tracer.init({
  runtimeMetrics: true,
  profiling: true,
  logInjection: true,
  // capture 100 % APM traces
  /* ingestion: {
    // Any traces started will be sampled at 100.00% with a rate limit of 100 per second
    sampleRate: 1.0,
  }, */
}); // initialized in a different file to avoid hoisting.
export default tracer;
