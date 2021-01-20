# general-runtime

[![codecov](https://codecov.io/gh/voiceflow/general-runtime/branch/master/graph/badge.svg?token=WHYHNCC9FW)](https://codecov.io/gh/voiceflow/general-runtime)

`general-runtime` is an http webhook service that handles voiceflow prototype requests and generates a response. It manages the state of the user based on the programs (flows) made on the Voiceflow Creator tool.

> ⚠️ **This repository is still undergoing active development**: Major breaking changes may be pushed periodically and the documentation may become outdated - a stable version has not been released

## client architecture

![client architecture](https://user-images.githubusercontent.com/5643574/92404808-5a927e00-f102-11ea-8229-dc7bb1c9c15b.png)

### anatomy of an interaction

1. user says/types something to prototype tool, prototype tool uses regex to transcribe user intent, then sends it via webhook (along with other metadata i.e. _userID_) to `general-runtime`
2. fetch user state (JSON format) from **end user session storage** based on a _userID_ identifier
3. fetch project version data for initialization parameters from **Voiceflow API/Project File**
4. fetch the current program (flow) that the user is on from **Voiceflow API/Project File**
5. go through each block and update the user state
6. save the final user state to **end user session storage**
7. generate a response based on the final user state, send back to prototype tool
8. prototype tool interprets response and speaks to user

repeat all steps each time a user speaks/types to the prototype tool, to perform a conversation

## environment variables

`voiceflow/general-runtime` reads environment variables from a `.env.[environment]` file, where `[environment]` is either `local` or `production` depending on if you run `yarn local` or `yarn start`, respectively. (there is also an `.env.test` for integration tests)

### types

| name                            | example/values               |                                                                                                                desc | required |
| ------------------------------- | :--------------------------- | ------------------------------------------------------------------------------------------------------------------: | -------- |
| `PORT`                          | `4000`                       |                                                                                  http port that service will run on | YES      |
| `PROJECT_SOURCE`                | `VF-Project-nPDdD6qZJ9.json` |            JSON File inside `/projects` to read version/program metadata - if undefined will use `VF_DATA_ENDPOINT` | NO       |
| `SESSIONS_SOURCE`               | `local` \| `remote`          |           if `local` read/write sessions to memory, otherwise if `remote` or undefined read/write to DynamoDB` | NO |
| `VF_DATA_ENDPOINT`              | `http://localhost:8200`      | cloud endpoint to read Voiceflow version and program metadata, doesn't matter if `PROJECT_SOURCE` is a defined file | YES      |
| `CODE_HANDLER_ENDPOINT`         | `none`                       |                                                          stateless cloud service endpoint to execute the code block | YES      |
| `INTEGRATIONS_HANDLER_ENDPOINT` | `http://localhost:8100`      |                   cloud endpoint for zapier/google blocks - not available if `general-runtime` is ran as standalone | YES      |
| `API_HANDLER_ENDPOINT`          | `http://localhost:8803`      |                                                         stateless cloud endpoint for the API block to make requests | YES      |
| `DATADOG_API_KEY`               | `none`                       |                                                                                datadog API key for logging purposes | YES      |
| `LOG_LEVEL`                     | `none` \| `warn`             |                                                                                        logging verbosity and detail | NO       |
| `MIDDLEWARE_VERBOSITY`          | `none` \| `warn` \| `debug`  |                                                                       request/response logging verbosity and detail | NO       |

# configurations

## local/debugging setup

export your voiceflow project from the creator tool. Each time you update your project you will need to export again. You can find the export option here:

![Screenshot from 2020-09-07 12-14-44](https://user-images.githubusercontent.com/5643574/92405522-c3c6c100-f103-11ea-8ba8-6c10173e3419.png)

It should save a VF-Project JSON file from your browser that would be named similar to this: `VF-Project-nPDdD6qZJ9.json`

fork `voiceflow/general-runtime` and clone to your local machine. Ensure `nodejs`, `npm`, and `yarn` are set up on your local machine. Run

```
yarn
```

to install all dependencies.

Add your VF-Project JSON file under `projects/`

Also add the following files to the local repository:

> `.env.local`
>
> ```
> SESSIONS_SOURCE='local'
> PROJECT_SOURCE='[YOUR EXPORTED PROJECT FILE HERE (i.e. VF-Project-nPDdD6qZJ9.json)]'
>
> PORT=4000
> SESSIONS_DYNAMO_TABLE="none"
> VF_DATA_ENDPOINT="none"
>
> CODE_HANDLER_ENDPOINT="none"
> INTEGRATIONS_HANDLER_ENDPOINT="none"
> API_HANDLER_ENDPOINT="none"
>
> LOG_LEVEL="warn"
> MIDDLEWARE_VERBOSITY="none"
>
> DATADOG_API_KEY="none"
> ```

Install a localhost tunnel tool such as [ngrok](https://ngrok.com/), [localtunnel](https://github.com/localtunnel/localtunnel), or [bespoken proxy](https://read.bespoken.io/cli/commands/#bst-proxy-http). This will allow you expose a localhost endpoint on the internet for Alexa to hit. For the purposes of this guide, we will implement `ngrok`

Run your local instance of `voiceflow/general-runtime` with

```
yarn local
```

This will now be running on port 4000 of localhost. Expose this with

```
ngrok http 4000
```

In your shell you will see a link similar to this - `https://e9g1335dd0ac.ngrok.io`, note this down. Ensure you copy the `https://` version instead of `http://`

# Notable Code Locations

[lib/services/runtime/handlers](https://github.com/voiceflow/general-runtime/tree/master/lib/services/runtime/handlers) - handlers for all the various blocks and defining their behavior

# Context Handlers

On each request to `/interact/:versionID` a turn context is [initialized](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/controllers/interact.ts#L26). [Turn Context](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L33) is a context with a lifespan of one request. It handles the request through its `handle` method. [handle](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L16) passes the request through the Turn Context handlers.
These handlers are added to the Turn Context after init [here](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/controllers/interact.ts#L27).
The handlers are added to the context's [pipe system](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L9). Each pipe is an ordered array of [Context Handlers](https://github.com/voiceflow/runtime/blob/058fdd208ece6d7361c2af8f0b7b291a37671b69/lib/Context/types.ts#L16). The pipes are executed in order, one after the other. To break early and not proceed to the next handler in the pipe or to the next pipe, a handler can set [`request.end = true`](https://github.com/voiceflow/runtime/blob/66e167e281eef019632b2ca6bf11305f032e807e/lib/Context/index.ts#L25) (example [here](https://github.com/voiceflow/general-runtime/blob/9727599fff72fb7a3114229732fffa5410c03a23/lib/services/dialog/index.ts#L167) the dialog managment needs to ask for additional info from the user to populate intent and entities).
Here's a list of the handlers used in this project:

## [ASR](https://github.com/voiceflow/general-runtime/blob/541c603064666c66c96d0b038a9f67890c7f1b24/lib/services/asr/index.ts#L8)

The Automated Speech Recognition handler is currectly just a pass-through handler without an implementation. The implementation is left to the user according to their usecase.

## [NLU](https://github.com/voiceflow/general-runtime/blob/9727599fff72fb7a3114229732fffa5410c03a23/lib/services/nlu/index.ts#L13)

The Natural Language Understanding handler matches the utterance in the request to an intent in the project interaction model. The current implementation uses one of our Voiceflow's internal services which exposes NLU capabilities.

## [DIALOG](https://github.com/voiceflow/general-runtime/blob/9727599fff72fb7a3114229732fffa5410c03a23/lib/services/dialog/index.ts#L23)

The Dialog Managment handler ensures the required entities in a slot are filled before sending the request to the next handler in the pipe. In case information is missing, the handler prompts the user for the missing entities and returns early from the pipes.

## [RUNTIME](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/services/runtime/index.ts#L18)

The Runtime Handler is responsible for executing the state machine transition between states, based on the diagrams designed by the user in the creator tool. The Runtime takes in the users previous session and their current request (with an intent already matched) and outputs an updated state and a trace which indicates what to speak or play next.<br/><br/>
Everything before the `runtime` handler is about pre-processing the request to go from a text or audio utterance to a matched intent with filled entities.<br/>
Everything after the `runtime` handler is about post-processing the traces object to transform it into audio or text to present to the end user.<br/><br/>

Additional documentation can be found in the `runtime` [github repo](https://github.com/voiceflow/runtime).

## [TTS](https://github.com/voiceflow/general-runtime/blob/88ebc7f2ac0f8b9ad4dd5f9a190e056d6fa8de8d/lib/services/tts/index.ts#L13)

The Text to Speech handler transforms the traces text into audio with specific voices. The current implementation uses one of our Voiceflow's internal services which can be overriden to use a custom one.

## [CHIPS](https://github.com/voiceflow/general-runtime/blob/f0f653753da42d67033598d3c228e460b4655863/lib/services/chips/index.ts#L14)

The Chips handler adds possible choices in each trace frame for the user to choose from as a response to a question.
The terminology comes from [suggestion chips in google actions](https://developers.google.com/assistant/conversational/df-asdk/rich-responses#suggestion_chips)
