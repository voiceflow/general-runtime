# Context Handlers

On each request to `/interact/:versionID` a turn context is [initialized](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/controllers/interact.ts#L26). <br/>
[Turn Context](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L33) is a context with a lifespan of one request. It handles the request through its `handle` method. The [method](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L16) passes the request through the context handlers.<br/>
These handlers are added to the Turn Context after the class init [here](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/controllers/interact.ts#L27) and inserted in the [pipe system](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L9). <br/><br/>
Each pipe is an ordered array of [Context Handlers](https://github.com/voiceflow/runtime/blob/058fdd208ece6d7361c2af8f0b7b291a37671b69/lib/Context/types.ts#L16). The pipes are executed in order, one after the other. To break early and not proceed to the next handler in the pipe or to the next pipe, a handler can set [`request.end = true`](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L25) (i.e, [here](https://github.com/voiceflow/general-runtime/blob/9727599fff72fb7a3114229732fffa5410c03a23/lib/services/dialog/index.ts#L167) the dialog managment needs to ask for additional info from the user to populate intent and entities). <br/><br/>
The system is extensible and depending on the use case handlers can be added or removed.
Here's a list of the handlers used in this project:

- [ASR](https://voiceflow-general-runtime.netlify.app/modules/lib_services_asr.html)
- [NLU](https://voiceflow-general-runtime.netlify.app/modules/lib_services_nlu.html)
- [DIALOG](https://voiceflow-general-runtime.netlify.app/modules/lib_services_dialog.html)
- [RUNTIME](https://voiceflow-general-runtime.netlify.app/modules/lib_services_runtime.html)
- [TTS](https://voiceflow-general-runtime.netlify.app/modules/lib_services_tts.html)
- [CHIPS](https://voiceflow-general-runtime.netlify.app/modules/lib_services_chips.html)
