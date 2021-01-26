module.exports = {
  out: './docs',
  name: 'Voiceflow General Runtime',
  includeVersion: true,
  tsconfig: 'tsconfig.build.json',
  readme: 'README.md',
  excludeExternals: true,
  excludePrivate: true,
  hideGenerator: true,
  media: './assets/media',
  gitRemote: 'https://github.com/voiceflow/general-runtime',
  includes: './documentation',
  'sourcefile-url-prefix': 'https://github.com/voiceflow/general-runtime/blob/master/',
};
