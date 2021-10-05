const name = 'general-runtime';

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
