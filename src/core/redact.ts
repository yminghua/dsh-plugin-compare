export interface RedactionResult {
  text: string
  matches: number
}

const SECRET_PATTERNS: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['bearer_token', /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi],
  ['github_token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g],
  ['api_key', /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/g],
]

export function redactSecrets(input: string): RedactionResult {
  let text = input
  let matches = 0
  for (const [label, pattern] of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      matches += 1
      return `[REDACTED:${label}]`
    })
  }
  return { text, matches }
}
