// Rule-based safety overrides. These run BEFORE the ML classifier — when a
// message matches one of the patterns below, we return a fixed, vetted
// response without invoking the model. This keeps safety-critical replies
// (mental health, acute medical, eating disorders) out of probabilistic
// territory where a misclassification could cause harm.

type Override = {
  pattern: RegExp;
  intent: string;
  reply: string;
};

export const OVERRIDES: Override[] = [
  // Self-harm / mental health crisis
  {
    pattern:
      /\b(suicid|kill myself|end my life|self[- ]?harm|don'?t want to live|want to die)\b/i,
    intent: 'safety_mental_health',
    reply:
      "I'm really glad you reached out, but I'm not the right help for that. Please contact a crisis line in your country (e.g. 988 in the US, 999 or 03-7956 8144 in Malaysia) or talk to someone you trust right now. You're not alone.",
  },

  // Acute medical emergencies
  {
    pattern:
      /\b(chest pain|can'?t breathe|cannot breathe|passing out|passed out|fainted|severe pain|unconscious)\b/i,
    intent: 'safety_acute_medical',
    reply:
      "That sounds urgent — please stop training and seek medical attention right away (call your local emergency number).",
  },

  // Sharp / popping injury during training
  {
    pattern: /\b(sharp pain|heard a pop|popped|tore|snapped|gave out)\b/i,
    intent: 'safety_injury',
    reply:
      "Stop the session immediately, ice the area if it's swelling, and book a physio or doctor before training that area again.",
  },

  // Disordered eating
  {
    pattern:
      /\b(starv|not eating|skip(ping)? meals|throw up after|purg(e|ing)|laxative|binge|anorexi|bulimi)\b/i,
    intent: 'safety_disordered_eating',
    reply:
      "I'm not the right resource for that. Please reach out to a registered dietitian or a healthcare professional — your safety matters more than any training plan.",
  },

  // Use of unsafe substances
  {
    pattern:
      /\b(steroid|sarms|clenbuterol|peptide|hgh|trenbolone|deca|anabolic)\b/i,
    intent: 'safety_substances',
    reply:
      "I can't give advice on performance-enhancing substances. Please talk to a qualified medical professional — natural training, food, and recovery will get you 95% of the results safely.",
  },
];

export function checkOverrides(
  message: string,
): { intent: string; reply: string } | null {
  for (const o of OVERRIDES) {
    if (o.pattern.test(message)) {
      return { intent: o.intent, reply: o.reply };
    }
  }
  return null;
}
