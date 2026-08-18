// ============================================================
// Ascend — quote bank
// Original lines only, no external API. Rotates locally.
// ============================================================

const QUOTES = [
  "The weight doesn't care how you feel about it. Pick it up anyway.",
  "Progress is boring in the moment and obvious in the mirror six months later.",
  "You don't have to want to. You just have to show up.",
  "Every rep you don't skip is a vote for who you're becoming.",
  "Discipline is just motivation that doesn't need to be asked twice.",
  "The set that feels hardest is usually the one doing the most work.",
  "Nobody regrets the workout they finished.",
  "Strength is a receipt, not a promise. You have to earn it again today.",
  "Small weight, added consistently, beats heavy weight added never.",
  "You're not behind. You're exactly as far as your last decision put you.",
  "The bar doesn't know you're tired. Load it anyway.",
  "Comfort is where progress goes to stall.",
  "One more rep than last time is still progress.",
  "Nothing about this gets easier. You just get capable of more.",
  "The version of you that skips today is not the one you're training to become.",
  "Consistency beats intensity when intensity can't show up twice a week.",
  "You are one workout away from a better mood, every single time.",
  "Effort compounds quietly until one day it doesn't.",
  "The hardest part is always putting on the shoes.",
  "Nobody's watching. Do it well anyway.",
  "Today's work doesn't need to be impressive. It needs to happen.",
  "Discomfort now is just strength that hasn't introduced itself yet.",
  "You don't rise to your goals. You fall to your systems.",
  "The weight goes up because you keep showing up when it's inconvenient.",
  "A rep you almost skip counts double.",
  "Your body believes whatever you keep proving to it.",
  "It's not about being ready. It's about starting anyway.",
  "The plateau breaks the same way it formed — one session at a time.",
  "You already know what to do. Go do the boring part.",
  "Tired is a feeling, not a stopping point.",
  "The people who keep going aren't more talented. They're just still here.",
  "Every heavy day was once a warm-up weight.",
  "Show up for the version of you that hasn't given up yet.",
  "The work doesn't owe you a good mood first.",
  "Strong isn't a look. It's a habit that eventually looks like something.",
  "You can be in a bad mood and still hit the number. Both are allowed.",
  "The only rep that doesn't count is the one you didn't do.",
  "Momentum is built by people who moved before they felt like it.",
  "Nobody becomes consistent by accident.",
  "Today's effort is a letter to the person you'll be in a year.",
  "The floor doesn't care about your excuses. Neither does progress.",
  "You don't need a better plan. You need to run the one you have.",
  "Getting stronger is mostly just not quitting on the easy days.",
  "The workout you almost didn't do is usually the one that mattered most.",
  "Your future self is training right now, whether you help or not.",
  "Discipline looks like nothing until it looks like everything.",
  "You're allowed to go slow. You're not allowed to stop.",
  "The weight room doesn't lie. It just waits for you to be honest.",
  "One good session doesn't make you strong. Neither does one bad one break you.",
  "Push until the rep is real, not until it looks finished.",
  "Recovery is part of the work, not a break from it.",
  "The goal isn't motivation. It's making the decision only once.",
  "You don't have to feel powerful to train like it.",
  "Every session you log is proof you can be trusted by yourself.",
  "The best time to add weight was last week. The next best time is today.",
  "Strength training is just repeated proof that you follow through.",
  "Nobody outworks their own consistency.",
  "You're not chasing a body. You're chasing the person who doesn't quit.",
  "The hard set is where the actual training happens.",
  "Show up tired. Show up sore. Just show up.",
  "A rep done badly still teaches your body something. A rep skipped teaches nothing.",
  "The number on the bar is just a record of how many times you didn't quit.",
  "You get to decide, every single day, whether today counts.",
  "Slow progress is still the opposite of no progress.",
  "Train like the only person you're competing with is who you were last month.",
  "The weight feels heavy right up until it doesn't anymore.",
  "Nobody built anything worth having on their good days alone.",
  "You don't need to feel ready. You need to start the first set.",
  "What you repeat, you become. Choose the rep wisely.",
  "The gap between where you are and where you want to be is just repetition."
];

/** Returns a quote different from the given one, when possible. */
function getRandomQuote(excludeQuote) {
  if (QUOTES.length === 1) return QUOTES[0];
  let next;
  do {
    next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  } while (next === excludeQuote);
  return next;
}
