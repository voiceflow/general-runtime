// eslint-disable-next-line @typescript-eslint/no-var-requires
const pjson = require('./package.json');

const name = pjson.name.replace(/^@[a-zA-Z0-9-]+\//g, '');

module.exports = {
  apps: [
    {
      name,
      script: './start.js',
      watch: true,
      node_args: '--max_old_space_size=8192',
    },
  ],
};
