export interface RedactionResult {
  text: string
  matches: number
}

const SECRET_PATTERNS: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['bearer_token', /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi],
  ['credential_url', /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s/:@]+:[^\s/@]+@[^\s"'<>]+/gi],
  ['github_token', /\b(?:github_pat_[A-Za-z0-9_]{20,}|(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,})\b/g],
  ['gitlab_token', /\bglpat-[A-Za-z0-9_-]{20,}\b/g],
  ['npm_token', /\bnpm_[A-Za-z0-9]{20,}\b/g],
  ['slack_token', /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g],
  ['sendgrid_key', /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g],
  ['google_api_key', /\bAIza[A-Za-z0-9_-]{35}\b/g],
  ['aws_access_key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g],
  ['api_key', /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}\b/g],
  ['secret_key', /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{16,}\b/g],
  ['named_credential', /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)["']?\s*[:=]\s*["']?[^\s"',;}\[]{8,}["']?/gi],
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
