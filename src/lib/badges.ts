export const ADD_BATHROOM_POINTS = 20;
export const RATING_POINTS = 2;
export const CRITIQUE_POINTS = 10;
export const SECONDARY_POINTS = 1;

export type BadgeTone =
  | "porcelain"
  | "forest"
  | "brass"
  | "ink"
  | "coral"
  | "moss"
  | "slate"
  | "wine"
  | "sand"
  | "tide";

export type BadgeCut = "plaque" | "ribbon" | "stamp" | "seal" | "ticket" | "tape" | "banner" | "chip";

export type BadgeTier = "starter" | "common" | "uncommon" | "rare" | "epic" | "legend";

export type BadgeDef = {
  id: string;
  title: string;
  cost: number;
  tone: BadgeTone;
  cut: BadgeCut;
  tier: BadgeTier;
};

export const BADGES: BadgeDef[] = [
  { id: "flush-newbie", title: "Flush Newbie", cost: 0, tone: "porcelain", cut: "chip", tier: "starter" },
  { id: "licensed-to-poop", title: "Licensed to Poop", cost: 48, tone: "ink", cut: "plaque", tier: "common" },
  { id: "bathroom-connoisseur", title: "Bathroom Connoisseur", cost: 212, tone: "brass", cut: "seal", tier: "rare" },
  { id: "privy-princess", title: "Privy Princess", cost: 142, tone: "wine", cut: "ribbon", tier: "uncommon" },
  { id: "pee-pee-bandit", title: "Pee Pee Bandit", cost: 83, tone: "coral", cut: "stamp", tier: "common" },
  { id: "angry-pooper", title: "Angry Pooper", cost: 72, tone: "coral", cut: "ticket", tier: "common" },
  { id: "tp-bandit", title: "Toilet Paper Bandit", cost: 107, tone: "sand", cut: "tape", tier: "uncommon" },
  { id: "double-wiper", title: "Double Wiper", cost: 95, tone: "slate", cut: "banner", tier: "uncommon" },
  { id: "urinal-inspector", title: "Urinal Inspector", cost: 188, tone: "forest", cut: "plaque", tier: "rare" },
  { id: "dr-clean", title: "Dr. Clean", cost: 259, tone: "tide", cut: "seal", tier: "rare" },
  { id: "stall-star", title: "Stall Star", cost: 37, tone: "porcelain", cut: "chip", tier: "common" },
  { id: "potty-mouth", title: "Potty Mouth", cost: 60, tone: "wine", cut: "stamp", tier: "common" },
  { id: "potty-trainer", title: "Potty Trainer", cost: 118, tone: "sand", cut: "ribbon", tier: "uncommon" },
  { id: "throne-keeper", title: "Throne Keeper", cost: 299, tone: "brass", cut: "plaque", tier: "epic" },
  { id: "flush-tycoon", title: "Flush Tycoon", cost: 504, tone: "brass", cut: "seal", tier: "epic" },
  { id: "royal-flush", title: "Royal Flush", cost: 679, tone: "wine", cut: "banner", tier: "legend" },
  { id: "full-house-stall", title: "Full House Stall", cost: 445, tone: "forest", cut: "ticket", tier: "epic" },
  { id: "straight-flush", title: "Straight Flush", cost: 387, tone: "tide", cut: "ribbon", tier: "epic" },
  { id: "number-two-fan", title: "Number Two Fan", cost: 48, tone: "sand", cut: "chip", tier: "common" },
  { id: "number-one-fan", title: "Number One Fan", cost: 37, tone: "tide", cut: "chip", tier: "common" },
  { id: "loo-natic", title: "Loo-natic", cost: 83, tone: "coral", cut: "tape", tier: "common" },
  { id: "porcelain-poet", title: "Porcelain Poet", cost: 165, tone: "porcelain", cut: "ribbon", tier: "rare" },
  { id: "commode-commander", title: "Commode Commander", cost: 235, tone: "ink", cut: "plaque", tier: "rare" },
  { id: "bidet-believer", title: "Bidet Believer", cost: 130, tone: "tide", cut: "seal", tier: "uncommon" },
  { id: "wipeout-winner", title: "Wipeout Winner", cost: 118, tone: "moss", cut: "banner", tier: "uncommon" },
  { id: "paper-trail", title: "Paper Trail", cost: 66, tone: "sand", cut: "ticket", tier: "common" },
  { id: "clog-buster", title: "Clog Buster", cost: 153, tone: "slate", cut: "stamp", tier: "uncommon" },
  { id: "plunger-paladin", title: "Plunger Paladin", cost: 200, tone: "forest", cut: "plaque", tier: "rare" },
  { id: "seat-down-sheriff", title: "Seat-Down Sheriff", cost: 107, tone: "ink", cut: "plaque", tier: "uncommon" },
  { id: "germ-away-guru", title: "Germ-Away Guru", cost: 177, tone: "moss", cut: "seal", tier: "rare" },
  { id: "soap-opera", title: "Soap Opera", cost: 72, tone: "tide", cut: "ribbon", tier: "common" },
  { id: "hand-washer", title: "Hand Washer", cost: 25, tone: "tide", cut: "chip", tier: "common" },
  { id: "air-freshener", title: "Air Freshener", cost: 60, tone: "moss", cut: "tape", tier: "common" },
  { id: "stall-sage", title: "Stall Sage", cost: 224, tone: "slate", cut: "plaque", tier: "rare" },
  { id: "latrine-legend", title: "Latrine Legend", cost: 562, tone: "brass", cut: "banner", tier: "legend" },
  { id: "outhouse-oracle", title: "Outhouse Oracle", cost: 247, tone: "sand", cut: "seal", tier: "rare" },
  { id: "porta-pro", title: "Porta-Pro", cost: 95, tone: "slate", cut: "ticket", tier: "uncommon" },
  { id: "rest-stop-ranger", title: "Rest-Stop Ranger", cost: 142, tone: "forest", cut: "stamp", tier: "uncommon" },
  { id: "gas-station-guru", title: "Gas Station Guru", cost: 118, tone: "brass", cut: "chip", tier: "uncommon" },
  { id: "key-for-the-loo", title: "Key for the Loo", cost: 83, tone: "ink", cut: "ticket", tier: "common" },
  { id: "code-cracker", title: "Stall Code Cracker", cost: 101, tone: "coral", cut: "stamp", tier: "uncommon" },
  { id: "accessible-ally", title: "Accessible Ally", cost: 130, tone: "tide", cut: "plaque", tier: "uncommon" },
  { id: "sparkle-squad", title: "Sparkle Squad", cost: 171, tone: "porcelain", cut: "banner", tier: "rare" },
  { id: "tile-tyrant", title: "Tile Tyrant", cost: 148, tone: "slate", cut: "seal", tier: "uncommon" },
  { id: "grout-scout", title: "Grout Scout", cost: 78, tone: "sand", cut: "chip", tier: "common" },
  { id: "mirror-checker", title: "Mirror Checker", cost: 43, tone: "ink", cut: "chip", tier: "common" },
  { id: "sink-sidekick", title: "Sink Sidekick", cost: 54, tone: "tide", cut: "ticket", tier: "common" },
  { id: "dryer-druid", title: "Dryer Druid", cost: 66, tone: "moss", cut: "stamp", tier: "common" },
  { id: "paper-towel-pro", title: "Paper Towel Pro", cost: 60, tone: "sand", cut: "ribbon", tier: "common" },
  { id: "lock-latch-lord", title: "Lock Latch Lord", cost: 113, tone: "ink", cut: "plaque", tier: "uncommon" },
  { id: "gap-gazer", title: "Gap Gazer", cost: 31, tone: "slate", cut: "tape", tier: "common" },
  { id: "hover-hero", title: "Hover Hero", cost: 89, tone: "coral", cut: "banner", tier: "common" },
  { id: "seat-saver", title: "Seat Saver", cost: 72, tone: "porcelain", cut: "ticket", tier: "common" },
  { id: "flush-and-run", title: "Flush and Run", cost: 37, tone: "coral", cut: "chip", tier: "common" },
  { id: "in-and-out", title: "In and Out", cost: 43, tone: "forest", cut: "chip", tier: "common" },
  { id: "five-toilet-club", title: "Five Toilet Club", cost: 329, tone: "brass", cut: "seal", tier: "epic" },
  { id: "one-toilet-club", title: "One Toilet Club", cost: 60, tone: "wine", cut: "stamp", tier: "common" },
  { id: "mid-flush", title: "Mid Flush", cost: 54, tone: "slate", cut: "chip", tier: "common" },
  { id: "restroom-reporter", title: "Restroom Reporter", cost: 136, tone: "ink", cut: "ribbon", tier: "uncommon" },
  { id: "critique-captain", title: "Critique Captain", cost: 183, tone: "forest", cut: "plaque", tier: "rare" },
  { id: "field-notes", title: "Field Notes", cost: 101, tone: "sand", cut: "ticket", tier: "uncommon" },
  { id: "map-piddler", title: "Map Piddler", cost: 83, tone: "tide", cut: "stamp", tier: "common" },
  { id: "pin-dropper", title: "Pin Dropper", cost: 124, tone: "coral", cut: "banner", tier: "uncommon" },
  { id: "new-stall-on-the-block", title: "New Stall on the Block", cost: 107, tone: "moss", cut: "tape", tier: "uncommon" },
  { id: "bathroom-cartographer", title: "Bathroom Cartographer", cost: 270, tone: "ink", cut: "seal", tier: "rare" },
  { id: "loo-cator", title: "Loo-cator", cost: 118, tone: "forest", cut: "chip", tier: "uncommon" },
  { id: "wee-wizard", title: "Wee Wizard", cost: 159, tone: "tide", cut: "plaque", tier: "rare" },
  { id: "tinkle-tank", title: "Tinkle Tank", cost: 78, tone: "tide", cut: "ticket", tier: "common" },
  { id: "leak-seeker", title: "Leak Seeker", cost: 66, tone: "slate", cut: "stamp", tier: "common" },
  { id: "hold-it-hero", title: "Hold-It Hero", cost: 89, tone: "coral", cut: "ribbon", tier: "common" },
  { id: "emergency-exit", title: "Emergency Exit", cost: 95, tone: "wine", cut: "banner", tier: "uncommon" },
  { id: "pit-stop-pilot", title: "Pit-Stop Pilot", cost: 113, tone: "brass", cut: "ticket", tier: "uncommon" },
  { id: "highway-hopper", title: "Highway Hopper", cost: 136, tone: "sand", cut: "plaque", tier: "uncommon" },
  { id: "truck-stop-titan", title: "Truck Stop Titan", cost: 206, tone: "brass", cut: "seal", tier: "rare" },
  { id: "mall-marauder", title: "Mall Marauder", cost: 101, tone: "wine", cut: "chip", tier: "uncommon" },
  { id: "park-piddler", title: "Park Piddler", cost: 72, tone: "moss", cut: "tape", tier: "common" },
  { id: "library-loo", title: "Library Loo", cost: 83, tone: "ink", cut: "ribbon", tier: "common" },
  { id: "cafe-cistern", title: "Cafe Cistern", cost: 66, tone: "sand", cut: "chip", tier: "common" },
  { id: "grocery-goer", title: "Grocery Goer", cost: 54, tone: "forest", cut: "chip", tier: "common" },
  { id: "stadium-sprinter", title: "Stadium Sprinter", cost: 148, tone: "ink", cut: "banner", tier: "uncommon" },
  { id: "airport-ace", title: "Airport Ace", cost: 218, tone: "slate", cut: "plaque", tier: "rare" },
  { id: "terminal-tinkler", title: "Terminal Tinkler", cost: 130, tone: "tide", cut: "stamp", tier: "uncommon" },
  { id: "night-flush", title: "Night Flush", cost: 107, tone: "ink", cut: "tape", tier: "uncommon" },
  { id: "dawn-dump", title: "Dawn Of The Dump", cost: 83, tone: "sand", cut: "stamp", tier: "common" },
  { id: "midnight-micturator", title: "Midnight Micturator", cost: 177, tone: "ink", cut: "seal", tier: "rare" },
  { id: "line-skipper", title: "Line Skipper", cost: 95, tone: "coral", cut: "chip", tier: "uncommon" },
  { id: "occupied-optimist", title: "Occupied Optimist", cost: 48, tone: "moss", cut: "ticket", tier: "common" },
  { id: "vacant-voyager", title: "Vacant Voyager", cost: 48, tone: "tide", cut: "ticket", tier: "common" },
  { id: "out-of-order-oracle", title: "Out of Order Oracle", cost: 124, tone: "wine", cut: "plaque", tier: "uncommon" },
  { id: "please-flush", title: "Please Flush", cost: 31, tone: "porcelain", cut: "chip", tier: "common" },
  { id: "thanks-for-flushing", title: "Thanks for Flushing", cost: 43, tone: "forest", cut: "ribbon", tier: "common" },
  { id: "watch-your-step", title: "Watch Your Step", cost: 54, tone: "sand", cut: "tape", tier: "common" },
  { id: "mind-the-gap", title: "Mind the Gap", cost: 66, tone: "ink", cut: "banner", tier: "common" },
  { id: "do-not-flush-hopes", title: "Do Not Flush Hopes", cost: 89, tone: "wine", cut: "ticket", tier: "common" },
  { id: "bowl-boss", title: "Bowl Boss", cost: 194, tone: "brass", cut: "plaque", tier: "rare" },
  { id: "tank-topper", title: "Tank Topper", cost: 142, tone: "slate", cut: "seal", tier: "uncommon" },
  { id: "handle-with-care", title: "Handle With Care", cost: 72, tone: "porcelain", cut: "ribbon", tier: "common" },
  { id: "chain-puller", title: "Chain Puller", cost: 101, tone: "brass", cut: "stamp", tier: "uncommon" },
  { id: "cistern-scholar", title: "Cistern Scholar", cost: 241, tone: "forest", cut: "plaque", tier: "rare" },
  { id: "valve-virtuoso", title: "Valve Virtuoso", cost: 229, tone: "tide", cut: "seal", tier: "rare" },
  { id: "float-philosopher", title: "Float Philosopher", cost: 165, tone: "moss", cut: "ribbon", tier: "rare" },
  { id: "wax-ring-royalty", title: "Wax Ring Royalty", cost: 317, tone: "brass", cut: "banner", tier: "epic" },
  { id: "septic-sage", title: "Septic Sage", cost: 253, tone: "sand", cut: "plaque", tier: "rare" },
  { id: "pipe-dreamer", title: "Pipe Dreamer", cost: 113, tone: "slate", cut: "tape", tier: "uncommon" },
  { id: "drain-brain", title: "Drain Brain", cost: 136, tone: "ink", cut: "chip", tier: "uncommon" },
  { id: "u-bend-buddy", title: "U-Bend Buddy", cost: 83, tone: "moss", cut: "ticket", tier: "common" },
  { id: "trap-door-titan", title: "Trap Door Titan", cost: 282, tone: "wine", cut: "seal", tier: "epic" },
  { id: "golden-throne", title: "Golden Throne", cost: 854, tone: "brass", cut: "banner", tier: "legend" },
  { id: "platinum-plunger", title: "Platinum Plunger", cost: 737, tone: "slate", cut: "plaque", tier: "legend" },
  { id: "diamond-dispenser", title: "Diamond Dispenser", cost: 796, tone: "tide", cut: "seal", tier: "legend" },
  { id: "emperor-of-exits", title: "Emperor of Exits", cost: 621, tone: "wine", cut: "ribbon", tier: "legend" },
  { id: "duke-of-dumps", title: "Duke of Dumps", cost: 475, tone: "brass", cut: "ticket", tier: "epic" },
  { id: "duchess-of-doo", title: "Duchess of Doo", cost: 475, tone: "wine", cut: "ticket", tier: "epic" },
  { id: "baron-of-bowls", title: "Baron of Bowls", cost: 416, tone: "forest", cut: "plaque", tier: "epic" },
  { id: "count-of-commodes", title: "Count of Commodes", cost: 399, tone: "ink", cut: "seal", tier: "epic" },
  { id: "squire-of-stalls", title: "Squire of Stalls", cost: 153, tone: "sand", cut: "chip", tier: "uncommon" },
  { id: "knight-of-the-knob", title: "Knight of the Knob", cost: 352, tone: "brass", cut: "banner", tier: "epic" },
  { id: "sanitation-senator", title: "Sanitation Senator", cost: 305, tone: "forest", cut: "plaque", tier: "epic" },
  { id: "hygiene-highness", title: "Hygiene Highness", cost: 375, tone: "tide", cut: "ribbon", tier: "epic" },
  { id: "clean-streak", title: "Clean Streak", cost: 188, tone: "porcelain", cut: "stamp", tier: "rare" },
  { id: "squeaky-clean", title: "Squeaky Clean", cost: 148, tone: "porcelain", cut: "chip", tier: "uncommon" },
  { id: "spotless-specimen", title: "Spotless Specimen", cost: 212, tone: "tide", cut: "seal", tier: "rare" },
  { id: "grime-fighter", title: "Grime Fighter", cost: 171, tone: "ink", cut: "banner", tier: "rare" },
  { id: "the-wiper-of-oz", title: "The Wiper of Oz", cost: 264, tone: "sand", cut: "plaque", tier: "rare" },
  { id: "lord-of-the-rings", title: "Lord of the Ring", cost: 1000, tone: "brass", cut: "seal", tier: "legend" },
  { id: "game-of-thrones", title: "Game of Thrones", cost: 340, tone: "wine", cut: "banner", tier: "epic" },
  { id: "flush-gordon", title: "Flush Gordon", cost: 200, tone: "tide", cut: "stamp", tier: "rare" },
  { id: "indiana-jones-john", title: "Indiana Jones of Johns", cost: 276, tone: "sand", cut: "ticket", tier: "rare" },
];

export const BADGE_BY_ID = new Map(BADGES.map((badge) => [badge.id, badge]));

export function getBadge(id: string | null | undefined): BadgeDef | null {
  if (!id) return null;
  return BADGE_BY_ID.get(id) ?? null;
}

export function reviewPoints(input: {
  rating?: number | null;
  critique?: string | null;
  cleanliness?: number | null;
  availability?: number | null;
  accessibility?: number | null;
  atmosphere?: number | null;
  accessType?: string | null;
  askForKey?: boolean | null;
  customersOnly?: boolean | null;
}): number {
  let points = 0;
  if (input.rating != null) points += RATING_POINTS;
  if ((input.critique ?? "").trim().length > 0) points += CRITIQUE_POINTS;
  if (input.cleanliness != null) points += SECONDARY_POINTS;
  if (input.availability != null) points += SECONDARY_POINTS;
  if (input.accessibility != null) points += SECONDARY_POINTS;
  if (input.atmosphere != null) points += SECONDARY_POINTS;
  if (input.accessType === "public" || input.accessType === "customers" || input.customersOnly) {
    points += SECONDARY_POINTS;
  }
  if (input.askForKey) points += SECONDARY_POINTS;
  return points;
}

export const TIER_LABEL: Record<BadgeTier, string> = {
  starter: "Starter",
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legend: "Legend",
};
