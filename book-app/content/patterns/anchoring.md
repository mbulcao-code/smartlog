# PATTERN 13 — Anchoring / Recency Bias

---

> **THE LAW**
> *Your last few trades aren't information about your edge. They're information about variance — and variance is not the same thing.*

---

## THE HOOK

After a winning streak, you sized up and gave a substantial portion of the gains back in one trade. After a losing streak, you sized down and missed the clean setups that would have recovered it. Either way, the sizing decision was driven by the recent sequence rather than the setup quality.

**The market doesn't know about your recent trades.** Your edge doesn't change because of them. Three losses in a row feel like a pattern. Statistically, on a setup with a 65% win rate, a three-trade losing sequence has a 4.3% probability — uncommon but expected over a large sample. It's noise in a known distribution. Your response to it was changing position size, which turned noise into a real structural change in your results.

---

## THE HUG

**What the impulse is protecting:**

After a winning streak: the Speculator wants the run to mean something — to be evidence of genuine edge rather than favorable variance. Pressing it is the action that expresses the belief.

After a losing streak: the Protector wants to reduce exposure until the "bad patch" passes — to protect against what might be a deteriorating edge. Reducing size is the response that addresses the threat.

Both are rational responses to perceived patterns. The patterns aren't real. The responses are.

---

## THE UNCERTAINTY BEHIND THE HUG

**The concrete question the urgency is asking:**
*Is my sizing correlated with recent streak context — and does that correlation produce better or worse outcomes than constant sizing across the same setups?*

Almost no trader has measured this. The answer almost always shows that streak-driven sizing adds variance without adding expectancy — and sometimes actively reduces it by concentrating larger positions in the low-base-rate tail events after losing streaks.

---

## THE MECHANISM

### The Congress Under Streak Conditions

After a winning streak: the Speculator has recent evidence. "This is working — press it." His case is backed by real wins. The Strategist's response ("sample too small to conclude") is abstract and requires statistical reasoning that emotional activation degrades. The Speculator wins. The trader sizes up.

After a losing streak: the Protector has recent evidence. "Something may be wrong — protect capital." The Strategist's response ("three losses on a 65%-win setup are expected variance") is also abstract. The Protector wins. The trader sizes down and misses the clean setups that follow.

In both directions, the voice with recent evidence beats the voice with statistical evidence. Not because recent evidence is better — because it's more emotionally salient and requires less cognitive effort to process than distributional reasoning.

---

### Transgression — The Streak Response

Trader A has won four of four trades. He sizes the fifth at 1.5x. It fails. The loss at 1.5x equals 1.5 of the previous wins. His net gain on the 5-trade sequence is less than it would have been at standard size throughout.

Trader B has lost four of four trades. A clean setup appears by full checklist. She enters at 0.5x — "just in case." The setup works and hits target. She earns 0.5R instead of 1R. Her standard recovery path would have required 3 sessions. Reduced sizing extended it to 5.

Neither did anything irrational by their own logic. Both let recency write their sizing rule.

---

### Observance — The Constant Size

A trader implements one rule: position sizing is determined by setup quality and account parameters only. Win or loss streaks do not change size.

After a winning streak: he feels the pull to size up. He doesn't. He logs that he felt it. After 12 months: he reviews outcomes in the 5 trades following any 3+ win streak. The setup performs at its historical rate — the streak was favorable variance, not enhanced edge. The sizing rule was correct.

After a losing streak: he feels the pull to reduce size. He doesn't. The next clean setup produces a win. At standard size. The recovery is on schedule.

---

## THE ARCHITECTURE

Recency bias produces two specific errors: the hot hand fallacy (winning streak = press it) and the gambler's fallacy (losing streak = due for a win or due for more losses). Both treat sequential independent events as narratively connected. Trading setups are not narratively connected. Setup 12 is not more likely to succeed because setups 9–11 won.

The correction is a statistical anchor: a reference distribution built from a sample large enough that a few results don't move it meaningfully. A trader who knows their setup produces a 65% win rate over 50 trades has a reference point that puts a 3-trade losing sequence in mathematical context. Without that anchor, recency fills the vacuum.

Building the distribution (logging 30+ trades of the primary setup) is the structural defense. The distribution is the anchor. Recency can't compete with a number built from 30 counted trades.

→ *[Act III.3: Stage 2 — why a sufficient sample provides the anchor recency cannot]*
→ *[Pattern 9: Overconfidence Bias — winning streak version of the same root mechanism]*

---

## ESS DESIGN

**Short-term (pirate fee):** Define sizing parameters based on setup quality and account parameters before the session — independent of recent results. One version for confirmed full-checklist setups (standard size), one version for partial-checklist setups (reduced size, logged as Variant A). The sizing decision is made before the session, not in response to the current streak.

**Long-term (the cure):** Pull last 30 trades and check sizing variation against streak context. Quantify the variance in outcomes attributable to sizing decisions vs. setup outcomes. That number is the recency tax — measurable, specific, and addressable by the constant-sizing rule.

---

## THE EXPERIMENT

Pull your last 30 trades. Map each sizing decision to the streak context at the time (how many wins or losses preceded it). Was there a pattern between streak context and sizing? If yes: re-simulate the same trade sequence at constant standard sizing and compare total R. The difference between the actual result and the constant-sizing simulation is the exact cost of recency-driven sizing in that period.

→ *[Act III.8: Reports — sizing analysis as a specific report type]*
→ *[Going Nerd: The Science of Probabilities — why 3 straight losses feel like a pattern]*
→ *[FAQ: How many trades before I have enough data?]*

---

---