module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Console statements allowed in server-side code
    'no-console': 'off',
    
    // Allow longer line lengths for readability
    'max-len': ['error', { 
      code: 120, 
      ignoreComments: true,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true
    }],
    
    // Allow underscore dangle for MongoDB/Prisma conventions
    'no-underscore-dangle': ['error', { 
      allow: ['_id', '_count', '_sum', '_avg', '_min', '_max'] 
    }],
    
    // Allow async without await (for fire-and-forget operations)
    'require-await': 'off',
    
    // Allow object property shorthand
    'object-shorthand': ['error', 'always'],
    
    // Prefer const assertion
    'prefer-const': 'error',
    
    // Allow multiple empty lines for section separation
    'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
    
    // Allow trailing commas
    'comma-dangle': ['error', 'only-multiline'],
    
    // Prefer arrow functions for callbacks
    'prefer-arrow-callback': 'error',
    
    // Allow implicit return
    'arrow-body-style': ['error', 'as-needed'],
    
    // Enforce consistent spacing
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Allow named exports
    'import/prefer-default-export': 'off',
    
    // Allow dev dependencies in config files
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/*.test.js',
        '**/*.spec.js',
        '**/jest.config.js',
        '**/webpack.config.js',
        '**/rollup.config.js',
        '**/gulpfile.js',
        '**/Gruntfile.js',
        '**/.eslintrc.js',
        '**/prisma/seed.js'
      ]
    }],
    
    // Allow console in development
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="console"][callee.property.name!=/^(log|warn|error|info|trace)$/]',
        message: 'Unexpected property on console object was called'
      }
    ],
    
    // Prisma specific rules
    'camelcase': ['error', { 
      properties: 'never',
      ignoreDestructuring: true,
      allow: ['^UNSAFE_', 'created_at', 'updated_at', 'user_id', 'company_id']
    }],
    
    // Allow async function without await for middleware
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    
    // Express specific
    'consistent-return': 'off', // Express middleware doesn't always return
  },
  
  // Override rules for specific file patterns
  overrides: [
    {
      // Test files
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-unused-expressions': 'off', // For chai assertions
        'max-len': 'off', // Test descriptions can be long
      }
    },
    {
      // Configuration files
      files: ['*.config.js', '.eslintrc.js'],
      rules: {
        'no-console': 'off',
      }
    },
    {
      // Prisma seed files
      files: ['prisma/seed.js'],
      rules: {
        'no-console': 'off',
        'max-len': 'off',
      }
    }
  ]
}; 