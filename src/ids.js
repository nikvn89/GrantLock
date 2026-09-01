// Python/JavaScript string parity for on-chain ID derivation.
//
// The contract derives every resource_id and grant_id from a payload that
// embeds BOTH the cleaned string and its length:
//
//   _clean_label / _clean_grant_text ->  value.strip()
//   _resource_id_for                 ->  "...|" + str(len(name)) + "|" + name
//
// JavaScript's String.prototype.trim() and String.prototype.length do not
// agree with Python's str.strip() and len() on two axes. Either disagreement
// makes the frontend derive an id the contract never wrote, so the app reports
// a failure for a transaction that actually succeeded.
//
//   1. WHITESPACE SET
//      Python str.strip() strips every code point where str.isspace() is true
//      (29 code points). JS trim() strips the ECMAScript WhiteSpace set
//      (25 code points). They differ both ways:
//
//        Python strips, JS does not:  U+001C U+001D U+001E U+001F U+0085
//        JS strips, Python does not:  U+FEFF
//
//   2. LENGTH UNIT
//      Python len() counts code points. JS .length counts UTF-16 code units,
//      so any astral character (emoji, rare CJK) counts twice.
//        "Atlas \u{1F3AC} rights"   Python len() = 14   JS .length = 15
//
// pyStrip and pyLen below reproduce the Python semantics exactly.

// The 29 code points for which Python's str.isspace() is true.
const PY_SPACE_CLASS =
  '\\t\\n\\v\\f\\r\\u001c-\\u001f \\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'

const PY_STRIP_START = new RegExp(`^[${PY_SPACE_CLASS}]+`, 'u')
const PY_STRIP_END = new RegExp(`[${PY_SPACE_CLASS}]+$`, 'u')

/** Exactly Python's str.strip(). */
export function pyStrip(value) {
  return String(value ?? '')
    .replace(PY_STRIP_START, '')
    .replace(PY_STRIP_END, '')
}

/** Exactly Python's len() — code points, not UTF-16 code units. */
export function pyLen(value) {
  return Array.from(String(value ?? '')).length
}
