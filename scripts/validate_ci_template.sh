#!/bin/bash -eo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# Optional argument to specify a values file
VALUES_FILE="${1:-values.test.json}"
OUTPUT_FILE="${2:-continue_config.yml}"

# This script is used to test the template in the current directory
cd "${SCRIPT_DIR}/../.circleci"
gomplate --file "continue_config.yml.tmpl" --context values="${VALUES_FILE}" --out "${OUTPUT_FILE}"
circleci config validate "${OUTPUT_FILE}"
