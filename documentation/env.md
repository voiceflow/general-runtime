# environment variables

`voiceflow/general-runtime` reads environment variables from a `.env.[environment]` file, where `[environment]` is either `local` or `production` depending on if you run `yarn local` or `yarn start`, respectively. (there is also an `.env.test` for integration tests)

## Example .env file

set up under the `creator-api` configuration

```
PORT=4000
LOG_LEVEL="info"
MIDDLEWARE_VERBOSITY="none"

CODE_HANDLER_ENDPOINT="none"
INTEGRATIONS_HANDLER_ENDPOINT="none"
API_HANDLER_ENDPOINT="none"

GENERAL_SERVICE_ENDPOINT='https://general-service.voiceflow.com'

CREATOR_API_ENDPOINT='https://api.voiceflow.com'
CREATOR_API_AUTHORIZATION='[YOUR JWT TOKEN HERE]'

# uncomment PROJECT_SOURCE to use local file
# PROJECT_SOURCE='file.vfr'
```

# definitions

## General Variables

- `PORT` **required** - http port that service will run on. [eg. `4000`]
- `LOG_LEVEL` **required** - logging verbosity and detail [eg. `info` | `warn` | `trace` | `error` | `fatal`]
- `MIDDLEWARE_VERBOSITY` **required** - express request/response logging verbosity and detail (only appears on `LOG_LEVEL='info'`) [eg. `none` | `full` | `short` | `debug`]
- `GENERAL_SERVICE_ENDPOINT` **required** - pointer to a general-service for NLP/NLU and TTS capabilities

---

## Configurations

Where to read your project info and diagrams from. Choose one of these sets of environment variables to populate. Likely you will use the creator-api implementation.

### creator-api

- `CREATOR_API_ENDPOINT` - voiceflow creator API [eg. `https://api.voiceflow.com`]
- `CREATOR_API_AUTHORIZATION` - voiceflow creator token (JWT string)

### local .vfr

Add your VF-Project JSON file under `projects/`

- `PROJECT_SOURCE` - JSON File inside /projects to read version/program metadata [e.g `VF-Project-nPDdD6qZJ9.json`]

### runtime-api (internal voiceflow dev use)

- `VF_DATA_ENDPOINT` - voiceflow runtime API
- `ADMIN_SERVER_DATA_API_TOKEN` - token generation key

---

## Mircoservices

External services needed to run certain blocks (API, Zapier, Google Docs, Code)

- `INTEGRATIONS_HANDLER_ENDPOINT` - cloud endpoint for zapier/google blocks - not available if `general-runtime` is ran as standalone
- `CODE_HANDLER_ENDPOINT` - stateless cloud service endpoint to execute the code block. Contact a Voiceflow representative to get an endpoint
- `API_HANDLER_ENDPOINT` - stateless cloud endpoint for the API block to make requests. Contact a Voiceflow representative to get an endpoint
