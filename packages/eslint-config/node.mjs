import globals from 'globals'

import { baseConfig } from './base.mjs'

export const nodeConfig = [
  ...baseConfig,
  {
    files: ['**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
]
