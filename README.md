# general-client

[![codecov](https://codecov.io/gh/voiceflow/general-client/branch/master/graph/badge.svg?token=WHYHNCC9FW)](https://codecov.io/gh/voiceflow/general-client)

`general-client` is an http webhook service that handles voiceflow prototype requests and generates a response. It manages the state of the user based on the programs (flows) made on the Voiceflow Creator tool.

> ⚠️ **This repository is still undergoing active development**: Major breaking changes may be pushed periodically and the documentation may become outdated - a stable version has not been released

## client architecture

![client architecture](https://user-images.githubusercontent.com/5643574/92404808-5a927e00-f102-11ea-8229-dc7bb1c9c15b.png)

### anatomy of an interaction

1. user says/types something to prototype tool, prototype tool uses regex to transcribe user intent, then sends it via webhook (along with other metadata i.e. _userID_) to `general-client`
2. fetch user state (JSON format) from **end user session storage** based on a _userID_ identifier
3. fetch project version data for initialization parameters from **Voiceflow API/Project File**
4. fetch the current program (flow) that the user is on from **Voiceflow API/Project File**
5. go through each block and update the user state
6. save the final user state to **end user session storage**
7. generate a response based on the final user state, send back to prototype tool
8. prototype tool interprets response and speaks to user

repeat all steps each time a user speaks/types to the prototype tool, to perform a conversation

## environment variables

`voiceflow/general-client` reads environment variables from a `.env.[environment]` file, where `[environment]` is either `local` or `production` depending on if you run `yarn local` or `yarn start`, respectively. (there is also an `.env.test` for integration tests)

### types

| name                            | example/values               |                                                                                                                desc | required |
| ------------------------------- | :--------------------------- | ------------------------------------------------------------------------------------------------------------------: | -------- |
| `PORT`                          | `4000`                       |                                                                                  http port that service will run on | YES      |
| `PROJECT_SOURCE`                | `VF-Project-nPDdD6qZJ9.json` |            JSON File inside `/projects` to read version/program metadata - if undefined will use `VF_DATA_ENDPOINT` | NO       |
| `SESSIONS_SOURCE`               | `local` \| `remote`          |           if `local` read/write sessions to memory, otherwise if `remote` or undefined read/write to DynamoDB` | NO |
| `VF_DATA_ENDPOINT`              | `http://localhost:8200`      | cloud endpoint to read Voiceflow version and program metadata, doesn't matter if `PROJECT_SOURCE` is a defined file | YES      |
| `CODE_HANDLER_ENDPOINT`         | `none`                       |                                                          stateless cloud service endpoint to execute the code block | YES      |
| `INTEGRATIONS_HANDLER_ENDPOINT` | `http://localhost:8100`      |                    cloud endpoint for zapier/google blocks - not available if `general-client` is ran as standalone | YES      |
| `API_HANDLER_ENDPOINT`          | `http://localhost:8803`      |                                                         stateless cloud endpoint for the API block to make requests | YES      |
| `DATADOG_API_KEY`               | `none`                       |                                                                                datadog API key for logging purposes | YES      |
| `LOG_LEVEL`                     | `none` \| `warn`             |                                                                                        logging verbosity and detail | NO       |
| `MIDDLEWARE_VERBOSITY`          | `none` \| `warn` \| `debug`  |                                                                       request/response logging verbosity and detail | NO       |

# configurations

## local/debugging setup

export your voiceflow project from the creator tool. Each time you update your project you will need to export again. You can find the export option here:

![Screenshot from 2020-09-07 12-14-44](https://user-images.githubusercontent.com/5643574/92405522-c3c6c100-f103-11ea-8ba8-6c10173e3419.png)

It should save a VF-Project JSON file from your browser that would be named similar to this: `VF-Project-nPDdD6qZJ9.json`

fork `voiceflow/general-client` and clone to your local machine. Ensure `nodejs`, `npm`, and `yarn` are set up on your local machine. Run

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

Run your local instance of `voiceflow/general-client` with

```
yarn local
```

This will now be running on port 4000 of localhost. Expose this with

```
ngrok http 4000
```

In your shell you will see a link similar to this - `https://e9g1335dd0ac.ngrok.io`, note this down. Ensure you copy the `https://` version instead of `http://`

# Notable Code Locations

[lib/services/voiceflow/handlers](https://github.com/voiceflow/general-client/tree/master/lib/services/voiceflow/handlers) - handlers for all the various blocks and defining their behavior
