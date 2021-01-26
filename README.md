# general-runtime

[![codecov](https://codecov.io/gh/voiceflow/general-runtime/branch/master/graph/badge.svg?token=WHYHNCC9FW)](https://codecov.io/gh/voiceflow/general-runtime)

`general-runtime` is an http webhook service that handles voiceflow prototype requests and generates a response. It manages the state of the user based on the programs (flows) made on the Voiceflow Creator tool.

> ⚠️ **This repository is still undergoing active development**: Major breaking changes may be pushed periodically and the documentation may become outdated - a stable version has not been released

# how interaction works

A `Context` consists of the `request`, the `state`, and the the `trace`.

- `request` is an object representing something the user has done
- `state` is the user metadata - what block they are currently on, what flow they are on, their variables
- `trace` is an list of things for whatever client is calling the `general-runtime` to show.

The `general-runtime` receives a `Context` without `trace`, and responds with a `Context` with the `trace`. Here's what it looks like:

1. user says/types something to the client, add the `request` to the `Context` and sends it via webhook to `general-runtime`
2. fetch project version data based on [env file](documentation/env.md)
3. fetch the current program (flow) that the user is on based on [env file](documentation/env.md)
4. go through each block and update the user `state`, if the user enters a new flow, go back to step 3.
5. generate a `Context` based on the final user state, send back to prototype tool
6. client interprets response and presents it to the user

repeat all steps each time a user speaks/types to the prototype tool, to perform a conversation.

Let's take a look at this interaction, the blue user text is the request.
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

# setup

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
> CODE_HANDLER_ENDPOINT="none"
> INTEGRATIONS_HANDLER_ENDPOINT="none"
> API_HANDLER_ENDPOINT="none"
>
> CREATOR_API_ENDPOINT='https://api.voiceflow.com'
> CREATOR_API_AUTHORIZATION='[YOUR JWT TOKEN HERE]'
>
> # uncomment PROJECT_SOURCE to use local file
> # PROJECT_SOURCE='file.vfr'
> ```
>
> For more info on [Environment Variables](https://voiceflow-general-runtime.netlify.app/modules/config.html)

# Notable Code Locations

[Documentation](https://voiceflow-general-runtime.netlify.app)<br/>
[Context Handlers](https://voiceflow-general-runtime.netlify.app/modules/lib_controllers_interact.html) - handlers for processing request<br/>
[lib/services/runtime/handlers](https://github.com/voiceflow/general-runtime/tree/master/lib/services/runtime/handlers) - handlers for all the various blocks and defining their behavior
