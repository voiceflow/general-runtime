# environment variables

`voiceflow/general-runtime` reads environment variables from a `.env.[environment]` file, where `[environment]` is either `local` or `production` depending on if you run `yarn local` or `yarn start`, respectively. (there is also an `.env.test` for integration tests)

## Example .env file

set up under the `creator-api` configuration

```
PORT=4000
LOG_LEVEL="info"
MIDDLEWARE_VERBOSITY="none"

GENERAL_SERVICE_ENDPOINT='https://general-service.voiceflow.com'

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

### local .vfr

Add your VF-Project JSON file under `projects/`

- `PROJECT_SOURCE` - JSON File inside /projects to read version/program metadata [e.g `VF-Project-nPDdD6qZJ9.json`]

---

## Mircoservices

External services needed to run certain blocks (API, Zapier, Google Docs, Code)

- `CODE_HANDLER_ENDPOINT` - stateless cloud service endpoint to execute the code block. Leave undefined to run custom code locally
