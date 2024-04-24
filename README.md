> [!WARNING]  
> Update April 24, 2024: the open-source general-runtime deployment will no longer be actively supported. A longer term sunset plan will be provided. It is not recommended to create dependencies or references to this respository.

----

# general-runtime

[![circle ci](https://circleci.com/gh/voiceflow/general-runtime.svg?style=shield)](https://circleci.com/gh/voiceflow/general-runtime)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=voiceflow_general-runtime&metric=coverage)](https://sonarcloud.io/dashboard?id=voiceflow_general-runtime)
[![sonar quality gate](https://sonarcloud.io/api/project_badges/measure?project=voiceflow_general-runtime&metric=alert_status)](https://sonarcloud.io/dashboard?id=voiceflow_general-runtime)

`general-runtime` is an http webhook service that handles voiceflow prototype requests and generates a response. It manages the state of the user based on the programs (flows) made on the Voiceflow Creator tool. This can be hosted independently from Voiceflow.

This is the same service that powers the Voiceflow test tool and [Voiceflow DM API](https://www.voiceflow.com/api/dialog-manager). This includes supporting production apps and handling millions of requests.

![](https://global-uploads.webflow.com/5bec5cb06b362b0cf5ae9c36/6126a136c1944e0f3ce74028_telegram-main-p-2000.png)

# Documentation

For a high level understanding of what the service is doing, reference ["What is the Voiceflow API and how do you use it?"](https://www.voiceflow.com/blog/voiceflow-api).

To interact with your `general-runtime` server, reference the [Voiceflow DM API](https://www.voiceflow.com/api/dialog-manager). Instead of the default `https://general-runtime.voiceflow.com`, use your own local or remote endpoint.

# Setup (Local)

run `yarn` in command line to install all dependencies.

For the `isolated-vm` dependency, there are additional steps to install [here](https://github.com/laverdet/isolated-vm#requirements)

Add the following file to the local repository:

> `.env.local`
>
> ```
> PORT=4000
> LOG_LEVEL="info"
> MIDDLEWARE_VERBOSITY="none"
>
> SESSIONS_SOURCE='local'
> GENERAL_SERVICE_ENDPOINT='https://general-service.voiceflow.com'
>
> # use local vfr file under /projects
> PROJECT_SOURCE='[VFFILE.vfr]'
> ```
>
> For more info on [Environment Variables](https://github.com/voiceflow/general-runtime/blob/master/documentation/env.md)

Use `yarn start:local` to run the development version.

For the production version, run `yarn build` followed by `yarn start` (this checks against `.env.production` instead of `.env.local`)

# Notable Code Locations

[Context Handlers](https://github.com/voiceflow/general-runtime/blob/master/lib/services/interact.ts) ([documentation](https://github.com/voiceflow/general-runtime/blob/master/documentation/contextHandlers.md))- handlers for processing request<br/>
[lib/services/runtime/handlers](https://github.com/voiceflow/general-runtime/tree/master/lib/services/runtime/handlers) - handlers for all the various nodes and defining their behavior<br/>
[runtime/lib/Runtime/cycleStack](https://github.com/voiceflow/general-runtime/blob/master/runtime/lib/Runtime/cycleStack.ts) - iterator and execution of flows<br/>
[runtime/lib/Runtime/cycleHandler](https://github.com/voiceflow/general-runtime/blob/master/runtime/lib/Runtime/cycleHandler.ts) - iterator and execution of individual nodes

# API Documentation (Open API)

Documentation for all API Endpoints on this service.
It is critical to make sure all OpenAPI docs are up to date:

https://github.com/voiceflow/general-runtime/tree/master/backend/docs/openapi.yaml

Whenever any of the paths change, or new ones get added, or if any of the behaviors documented change, be sure to update the Open API doc.
Recommend to use an editor like [Swagger Editor](https://editor.swagger.io/) or [Stoplight](https://stoplight.io) to help construct the YAML file, and then fine tune things on local.

## Local Setup

Run `npm i -g redoc-cli` to install as command.

While on the root of this repository, run

```
redoc-cli serve backend/docs/openapi.yaml --ssr --watch
```

to see it locally - note: this will not load the local CSS file.

If your browser autoresolves http://localhost to https://localhost, you might want to open the local link in incognito or a different browser.
