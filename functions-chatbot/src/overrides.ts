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
    // `suicid\w*` so the trailing \b lands at the real word end — bare `suicid`
    // would never match "suicide"/"suicidal" (no boundary mid-word).
    pattern:
      /\b(suicid\w*|kill myself|end my life|self[- ]?harm|don'?t want to live|want to die)\b/i,
    intent: 'safety_mental_health',
    reply:
      "I'm really glad you reached out, but I'm not the right help for that. Please contact a crisis line in your country (e.g. 988 in the US, 999 or 03-7956 8144 in Malaysia) or talk to someone you trust right now. You're not alone.",
  },

  // Acute medical emergencies (chest pain, breathing, fainting, dizziness)
  {
    pattern:
      /\b(chest pain|can'?t breathe|cannot breathe|passing out|passed out|fainted|severe pain|10\/10 pain|worst pain|unconscious|dizzy|dizziness|light[- ]?headed|lightheaded|black(ed|ing)? out)\b/i,
    intent: 'safety_acute_medical',
    reply:
      "That sounds urgent — please **stop training** and seek medical attention right away (call your local emergency number).\n\nDon't wait it out, and don't try to push through.",
  },

  // Sharp / popping injury during training, plus burning/stabbing/numbness
  {
    pattern:
      /\b(sharp pain|heard a pop|popped|tore|snapped|gave out|burning sensation|burning pain|stabbing|shooting pain|numbness|tingling|pins and needles|can'?t feel)\b/i,
    intent: 'safety_injury',
    reply:
      "**Stop the session immediately.** That's not normal soreness.\n\n- Ice the area if it's swelling (10–15 min)\n- Rest it — don't load it\n- Book a physiotherapist or doctor before training that area again\n\nI can't diagnose injuries, and pushing through can turn this into a long-term issue.",
  },

  // Disordered eating
  {
    // Prefixes get `\w*` so inflections match: starve/starving, anorexia/-ic,
    // bulimia/-ic. Bare prefixes + trailing \b never matched those.
    pattern:
      /\b(starv\w*|not eating|skip(ping)? meals|throw up after|purg(e|ing)|laxative|binge|anorexi\w*|bulimi\w*)\b/i,
    intent: 'safety_disordered_eating',
    reply:
      "I'm not the right resource for that. Please reach out to a registered dietitian or a healthcare professional — your safety matters more than any training plan.",
  },

  // Use of unsafe substances
  {
    // `steroid\w*` / `anabolic\w*` catch plurals (steroids, anabolics).
    pattern:
      /\b(steroid\w*|sarms|clenbuterol|peptide|hgh|trenbolone|deca|anabolic\w*)\b/i,
    intent: 'safety_substances',
    reply:
      "I can't give advice on performance-enhancing substances. Please talk to a qualified medical professional — natural training, food, and recovery will get you 95% of the results safely.",
  },

  // Pregnancy
  {
    // `pregnan\w*` matches pregnant/pregnancy — bare `pregnan` + trailing \b
    // matched neither (the next char is a word char, so no boundary).
    pattern:
      /\b(pregnan\w*|expecting|first trimester|second trimester|third trimester)\b/i,
    intent: 'safety_pregnancy',
    reply:
      "Congrats — but please train under guidance from your OB/GYN or a prenatal-certified coach. I can't tailor a safe plan for pregnancy here.\n\nGeneral pointers (not medical advice): keep intensity moderate, avoid supine positions after the first trimester, and stop anything that feels off.",
  },

  // Underage users (13 and under)
  {
    pattern:
      /\b(i'?m (\d|1[0-2]) (years?|yrs?|y[ -]?old)|under 13|under thirteen)\b/i,
    intent: 'safety_underage',
    reply:
      "If you're under 13, please ask a parent or in-person coach for training advice — strength training at your age is best supervised by someone who can watch your form. I'd rather be safe than sorry.",
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
