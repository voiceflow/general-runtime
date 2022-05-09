const pjson = require('./package.json');

const name = pjson.name.replace(/^@[\dA-Za-z-]+\//g, '');

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
