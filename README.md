# general-runtime

[![circle ci](https://circleci.com/gh/voiceflow/general-runtime/tree/master.svg?style=shield&circle-token=a041e74a416dfed4c1777c27c9867306c2f50824)](https://circleci.com/gh/voiceflow/general-runtime/tree/master)
[![codecov](https://codecov.io/gh/voiceflow/general-runtime/branch/master/graph/badge.svg?token=WHYHNCC9FW)](https://codecov.io/gh/voiceflow/general-runtime)
[![sonar quality gate](https://sonarcloud.io/api/project_badges/measure?project=voiceflow_general-runtime&metric=alert_status)](https://sonarcloud.io/dashboard?id=voiceflow_general-runtime)

`general-runtime` is an http webhook service that handles voiceflow prototype requests and generates a response. It manages the state of the user based on the programs (flows) made on the Voiceflow Creator tool.

> ⚠️ **This repository is still undergoing active development**: Major breaking changes may be pushed periodically and the documentation may become outdated - a stable version has not been released

# Context Definition

A `Context` can consist of the `request`, the `state`, the `config`, and the `trace`.

| Type             | Purpose                                                                                       | Definition                                                                                                                                                              | Example                                                                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GeneralRequest` | An object representing something the user has done.                                           | <pre>TextRequest \| IntentRequest<br>\| DataRequest \| null</pre>                                                                                                       | <pre>{<br>&nbsp;&nbsp;"type": "text",<br>&nbsp;&nbsp;"payload": "What is my balance?"<br>}</pre>                                                                                                                                                                                                     |
| `State`          | The user metadata - what block they are currently on, what flow they are on, their variables. | <pre>{<br>&nbsp;&nbsp;turn?: StorageState;<br>&nbsp;&nbsp;stack: FrameState[];<br>&nbsp;&nbsp;storage: StorageState;<br>&nbsp;&nbsp;variables: StorageState;<br>}</pre> | <pre>{<br>&nbsp;&nbsp;"stack": [{<br>&nbsp;&nbsp;&nbsp;&nbsp;programID: "home flow",<br>&nbsp;&nbsp;&nbsp;&nbsp;nodeID: "prompt node"<br>&nbsp;&nbsp;}],<br>&nbsp;&nbsp;"storage": {},<br>&nbsp;&nbsp;"variables": {<br>&nbsp;&nbsp;&nbsp;&nbsp;"chequing_balance": null<br>&nbsp;&nbsp;}<br>}</pre> |
| `Config`         | Contains options for what should be returned.                                                 | <pre>{<br>&nbsp;&nbsp;tts?: boolean;<br>}</pre>                                                                                                                         | <pre>{<br>&nbsp;&nbsp;tts: false;<br>}</pre>                                                                                                                                                                                                                                                         |
| `GeneralTrace`   | Things that the client is calling `general-runtime` to show.                                  | <pre>BlockTrace \| ChoiceTrace<br>\| DebugTrace \| EndTrace<br>\| FlowTrace \| AudioTrace<br>\| SpeakTrace \| VisualTrace</pre>                                         | <pre>{<br>&nbsp;&nbsp;"type": "speak",<br>&nbsp;&nbsp;"payload": {<br>&nbsp;&nbsp;&nbsp;&nbsp;"type": "message",<br>&nbsp;&nbsp;&nbsp;&nbsp;"message": "your balance is 0 dollars."<br>&nbsp;&nbsp;}<br>}</pre>   

# How interaction works

The `general-runtime` receives a `Context` without `trace`, and responds with a `Context` with `trace`. Here's what it looks like from the Voiceflow creator app prototype tool:

1. User says/types something to the client, add the `request` to the `Context` and sends it via webhook to `general-runtime`
2. Fetch project version data based on [env file](documentation/env.md)
3. Fetch the current program (flow) that the user is on based on [env file](documentation/env.md)
4. Go through each block and update the user `state`, if the user enters a new flow, go back to step 3.
5. Generate a `Context` based on the final user state, send back to prototype tool
6. Client interprets response and presents it to the user

Repeat all steps each time a user speaks/types to the prototype tool, to perform a conversation.

Let's take a look at this interaction: the blue user text is the request.
![Screen Shot 2021-01-22 at 12 21 49 PM](https://user-images.githubusercontent.com/5643574/105523483-6c894d80-5cac-11eb-900c-076ed15c1486.png)

The simplified example **request** `Context`

```
{
  "request": {
    "type": "text",
    "payload": "What is the balance in my chequing account"
  },
  "state": {
    "stack": [{
      programID: "home flow",
      nodeID: "prompt node"
    }],
    "storage": {},
    "variables": {
      "chequing_balance": null
    }
  }
}
```

The simplified example **response** `Context`

```
{
  "request": {
    "type": "intent",
    "payload": {
      "name": "check_balance_intent",
      "entities": {
        "name": "account",
        "value": "chequing"
      }
      "query": "What is the balance in my chequing account"
    }
  },
  "state": {
    "stack": [{
      programID: "home flow",
      nodeID: "yes no choice node"
    }],
    "storage": {},
    "variables": {
      "balance": 0
    }
  },
  "trace": [{
    "type": "speak",
    "payload": {
      "type": "message",
      "message": "the balance in your chequing account is 0 dollars, is that all?"
    },
  }, {
    "type": "choice",
    "payload": {
      "choices": [{"name": "yes"}, {"name": "no"}]
    }
  }],
}
```

Notice that the text `request` got processed by the NLP handler to become an intent type `request`.
The `state` is updated, and a `trace` is generated.

To use the endpoint without the creator app prototype tool or the [Runtime Client JavaScript SDK](https://github.com/voiceflow/runtime-client-js), you can start a conversation by hitting the `/interact/{VERSION_ID}` with no request body. This will generate the state for you, which you can save. To move the conversation forward, you can create a `GeneralRequest` object with your request and pass it in the response body to `/interact/{VERSION_ID}` along with the state and optionally a `Config` object. This will return an updated `State`, a processed `GeneralRequest`, and the `GeneralTrace[]` list containing the traces to display.                                                                                   |

# Interact endpoint

| Endpoint                           | Request Payload                                                                                                          | Response Payload                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| GET `/interact/{VERSION_ID}/state` | <pre>{}</pre>                                                                                                            | <pre>{<br>&nbsp;&nbsp;...state: State;<br>}</pre>                                                                            |
| POST `/interact/{VERSION_ID}`      | <pre>{<br>&nbsp;&nbsp;state?: State;<br>&nbsp;&nbsp;request?: GeneralRequest;<br>&nbsp;&nbsp;config?: Config;<br>}</pre> | <pre>{<br>&nbsp;&nbsp;state: State;<br>&nbsp;&nbsp;request: GeneralRequest;<br>&nbsp;&nbsp;trace: GeneralTrace[];<br>}</pre> |

# Setup

run `yarn` in command line to install all dependencies.

Add the following file to the local repository:

> `.env.local`
>
> ```
> PORT=4000
> LOG_LEVEL="info"
> MIDDLEWARE_VERBOSITY="none"
>
> GENERAL_SERVICE_ENDPOINT='https://general-service.voiceflow.com'
>
> INTEGRATIONS_HANDLER_ENDPOINT="none"
>
> CREATOR_API_ENDPOINT='https://api.voiceflow.com'
> CREATOR_API_AUTHORIZATION='[YOUR JWT TOKEN HERE]'
>
> # uncomment PROJECT_SOURCE to use local file
> # PROJECT_SOURCE='file.vfr'
> ```
>
> For more info on [Environment Variables](https://developer.voiceflow.com/general-runtime/modules/config.html)

# Notable Code Locations

[Documentation](https://developer.voiceflow.com/general-runtime/)<br/>
[Context Handlers](https://developer.voiceflow.com/general-runtime/modules/lib_controllers_interact.html) - handlers for processing request<br/>
[lib/services/runtime/handlers](https://github.com/voiceflow/general-runtime/tree/master/lib/services/runtime/handlers) - handlers for all the various blocks and defining their behavior
