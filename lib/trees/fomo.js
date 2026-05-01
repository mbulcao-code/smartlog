export const fomoTree = {
  id: "fomo",
  steps: [
    {
      id: "recognition",
      type: "message",
      text: "I hear you. FOMO is one of the most common patterns — and one of the most misunderstood.\n\nBefore we try to fix anything, let me ask you something.",
      next: "what_happens",
    },
    {
      id: "what_happens",
      type: "choice",
      text: "When you say you enter too early — which of these feels closer?",
      options: [
        {
          id: "a",
          label: "I have a level in mind, but I enter before price gets there",
          next: "consistent_check",
        },
        {
          id: "b",
          label: "I have conditions, but I jump in before all of them are met",
          next: "consistent_check",
        },
        {
          id: "c",
          label: "It depends — each trade feels a bit different",
          next: "foundation_intro",
        },
      ],
    },
    {
      id: "consistent_check",
      type: "choice",
      text: "Got it. And the setup behind these trades — is it mostly the same idea each time, or does it vary depending on the situation?",
      options: [
        {
          id: "a",
          label: "Mostly the same idea — I repeat it regularly",
          next: "reframe",
        },
        {
          id: "b",
          label: "It varies — I adapt to what I'm seeing",
          next: "foundation_intro",
        },
      ],
    },
    {
      id: "foundation_intro",
      type: "message",
      text: "That's actually the root of the problem — and it's more important than the entry itself.\n\nIf each trade is different, there's nothing to compare. You can't learn from data that isn't measuring the same thing.\n\nLet's step back for a moment.",
      next: "foundation_check",
    },
    {
      id: "foundation_check",
      type: "choice",
      text: "When you think about the trades where FOMO hits — do they tend to happen in a specific type of situation? A pattern you recognize?",
      options: [
        {
          id: "a",
          label: "Yes — there's a pattern I usually look for",
          next: "reframe",
        },
        {
          id: "b",
          label: "Not really — I trade different things depending on the day",
          next: "need_structure",
        },
      ],
    },
    {
      id: "need_structure",
      type: "message",
      text: "Then this is where we start — before variants, before logging, before anything.\n\nWithout a repeatable situation, there's nothing to compare. Every trade is a different experiment. And you can't learn from experiments that don't share a baseline.\n\nLet's define the simplest possible one.",
      next: "setup_type",
    },
    {
      id: "setup_type",
      type: "choice",
      text: "When you trade, what are you usually trying to do?",
      options: [
        {
          id: "reversal",
          label: "Catch a reversal — price has moved and I expect it to turn",
          next: "setup_anchor",
        },
        {
          id: "breakout",
          label: "Trade a breakout — price breaks through a level with momentum",
          next: "setup_anchor",
        },
        {
          id: "retest",
          label: "Enter on a retest — price returns to a level after a move",
          next: "setup_anchor",
        },
      ],
    },
    {
      id: "setup_anchor",
      type: "choice",
      text: "Good — that's your base.\n\nNow let's anchor it to something specific. Pick the type of level where this setup appears most often for you.",
      options: [
        {
          id: "prev_level",
          label: "Previous high or low",
          next: "setup_built",
        },
        {
          id: "intraday",
          label: "Intraday level — a level formed during the session",
          next: "setup_built",
        },
        {
          id: "ma",
          label: "Moving average or VWAP",
          next: "setup_built",
        },
      ],
    },
    {
      id: "setup_built",
      type: "message",
      text: "Now we have something real to work with.\n\nYou don't have a perfect strategy — you have a repeatable situation. That's all you need to start learning.\n\nNow let's talk about what's actually causing the FOMO.",
      next: "reframe",
    },
    {
      id: "reframe",
      type: "message",
      text: "Here's what's actually happening.\n\nFOMO isn't impatience. It isn't weakness.\n\nYour brain is trying to solve a real problem: you don't know which entry pays more. Early or later. So it defaults to urgency — get in before it's too late.\n\nThe real question is: would you want to actually know which one performs better?",
      next: "want_to_know",
    },
    {
      id: "want_to_know",
      type: "choice",
      text: "If you could see — with your own data — whether entering early or waiting actually makes a difference in results, would that change how you trade?",
      options: [
        {
          id: "yes",
          label: "Yes — I'd rather know than guess",
          next: "solution",
        },
        {
          id: "unsure",
          label: "Maybe — I'm not sure data would change my behaviour",
          next: "honest_reframe",
        },
      ],
    },
    {
      id: "honest_reframe",
      type: "message",
      text: "That's an honest answer — and an important one.\n\nHere's the thing: you're right that data alone doesn't change behaviour. What changes behaviour is seeing your own pattern clearly enough that the old one stops making sense.\n\nThat's exactly what we're building toward.",
      next: "solution",
    },
    {
      id: "solution",
      type: "message",
      text: "The fix for FOMO isn't discipline or patience.\n\nIt's comparison.\n\nInstead of asking yourself 'should I enter now?' — you run both. You label your early entries as Variant A. Your full-confirmation entries as Variant B. Same setup. Same level. Only the entry changes.\n\nAfter enough trades, you'll know which one actually works. Not feel it. Know it.",
      next: "ready",
    },
    {
      id: "ready",
      type: "choice",
      text: "Does this make sense as an approach? Are you ready to define what we're testing?",
      options: [
        {
          id: "yes",
          label: "Yes — let's define it",
          next: "build",
        },
        {
          id: "question",
          label: "I have a question first",
          next: "open_door",
        },
      ],
    },
    {
      id: "open_door",
      type: "message",
      text: "Fair — and the question is probably a good one.\n\nMost traders at this point wonder: 'What exactly counts as confirmation?' or 'What if my early entries sometimes work better?'\n\nIf that's yours: the answer is exactly why we're doing this. Logging both variants will answer it with your own data — better than any rule I could give you.\n\nIf it's something else, it will likely surface once you start. Bring it back and we'll work through it.\n\nFor now — let's get the structure defined.",
      next: "build",
    },
    {
      id: "build",
      type: "complete",
      text: "Here's what we're testing:\n\nVariant A — Early entry: you enter as soon as price reaches your area, before full confirmation.\n\nVariant B — Confirmation entry: you wait for your complete conditions to be met before entering.\n\nSame setup. Same level. Only the entry differs.\n\nYour job: for the next trades where this setup appears, log which variant you used and what happened. Don't change anything yet — just watch and label.",
    },
  ],
};
