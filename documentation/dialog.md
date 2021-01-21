## [DIALOG](https://github.com/voiceflow/general-runtime/blob/9727599fff72fb7a3114229732fffa5410c03a23/lib/services/dialog/index.ts#L23)

The Dialog Managment handler ensures the required entities in an intent are filled before sending the request to the next handler in the pipe. In case information is missing, the handler prompts the user for the missing entities and returns [early](https://github.com/voiceflow/general-runtime/blob/9727599fff72fb7a3114229732fffa5410c03a23/lib/services/dialog/index.ts#L167) from the pipes flow.
