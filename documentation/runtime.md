## [RUNTIME](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/services/runtime/index.ts#L18)

The Runtime Handler is responsible for executing the state machine transition between states, based on the diagrams designed by the user in the creator tool. The Runtime takes in the users previous session and their current request (with an intent already matched) and outputs an updated state and a trace which indicates what to speak or play next.<br/><br/>
Everything before the `runtime` handler is about pre-processing the request to go from a text or audio utterance to a matched intent with filled entities.<br/>
Everything after the `runtime` handler is about post-processing the traces object to transform it into audio or text to present to the end user.<br/><br/>
