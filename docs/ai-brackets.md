# AI brackets

Drop AI-generated (or otherwise hand-authored) brackets into any pool from the
admin portal. They appear on the leaderboard like any other bracket — scored
live against the real results — with a small 🤖 **AI** badge.

- **Page:** `/admin/ai-brackets` (linked from the Results admin via "AI brackets →").
- **Who can write them:** only the admin. `firestore.rules` lets the admin
  create/update/delete bracket docs whose ID starts with `ai-`, in any pool, at
  any time (these writes are *not* blocked by the submission deadline). Real
  users still can't touch them — a player can only write the bracket whose doc
  ID equals their own Google uid, and uids never start with `ai-`.

## How to use it

1. Open `/admin/ai-brackets`.
2. Paste one picks file (a JSON object) **or an array** of them into the editor.
   Click **Show example format** to see/copy a complete, valid file, or **Show
   team codes** for the code ↔ country reference.
3. Click **Validate**. Each bracket shows ✓ with a one-line summary (champion,
   finalists, 3rd-place winner) or ✗ with the exact problems to fix.
4. Tick the pools it should appear in.
5. Click **Add … to … pools**. Each row reports success/failure.

Re-adding the same bracket (same `id`/nickname) to a pool overwrites it in
place. The **Current AI brackets** list at the bottom shows every AI bracket
across all pools with a **Remove** button.

## File format

A bracket is described by **who finishes where in each group** and **who reaches
each knockout round** — not by raw match numbers — so it's easy to author from a
model's prose. The full reference example lives at
[`ai-bracket-template.json`](./ai-bracket-template.json) and in the admin page.

```jsonc
{
  "nickname": "🤖 GPT-5",          // shown on the leaderboard (required)
  "id": "gpt-5",                   // optional; the doc id becomes "ai-" + id.
                                   //   defaults to a slug of the nickname.

  // Predicted final standings for all 12 groups, 1st → 4th.
  // Each list must be a reordering of exactly that group's four teams.
  "groups": {
    "A": ["MEX", "KOR", "RSA", "CZE"],
    "B": ["SUI", "CAN", "BIH", "QAT"],
    // ... C through L ...
  },

  // The 8 of 12 groups whose 3rd-place team advances to the Round of 32.
  "thirdPlaceAdvancers": ["A", "C", "D", "F", "H", "I", "K", "L"],

  // Who WINS in each round (i.e. reaches the next one).
  "advancers": {
    "roundOf16":     ["...16 teams..."], // teams that win their R32 match
    "quarterfinals": ["...8 teams..."],  // teams that win their R16 match
    "semifinals":    ["...4 teams..."],  // teams that win their QF match
    "final":         ["...2 teams..."],  // teams that win their SF match
    "champion":      "ARG",              // wins the Final
    "thirdPlaceWinner": "FRA"            // wins the 3rd-place playoff
  },

  "finalGoalsGuess": 3                   // optional leaderboard tiebreaker (0–99)
}
```

**Team tokens** accept either the FIFA code (`MEX`) or the full name (`Mexico`),
case-insensitively, plus a few common aliases (`USA`, `South Korea`, `Türkiye`,
…). The parser resolves every matchup through the same logic the editor and
scorer use, so anything that validates is guaranteed to be a complete,
internally-consistent bracket. Common errors it catches:

- a group list that isn't a permutation of its four teams,
- a `thirdPlaceAdvancers` set that isn't exactly 8 groups,
- a champion who isn't one of the two finalists,
- any round-advancer list that's inconsistent with earlier rounds (e.g. a
  quarter-finalist who didn't win their Round-of-16 match).

### Team codes

| Group | Teams |
|---|---|
| A | `MEX` Mexico · `RSA` South Africa · `KOR` Korea Republic · `CZE` Czechia |
| B | `CAN` Canada · `BIH` Bosnia & Herzegovina · `QAT` Qatar · `SUI` Switzerland |
| C | `BRA` Brazil · `MAR` Morocco · `HAI` Haiti · `SCO` Scotland |
| D | `USA` United States · `PAR` Paraguay · `AUS` Australia · `TUR` Türkiye |
| E | `GER` Germany · `CUW` Curaçao · `CIV` Ivory Coast · `ECU` Ecuador |
| F | `NED` Netherlands · `JPN` Japan · `SWE` Sweden · `TUN` Tunisia |
| G | `BEL` Belgium · `EGY` Egypt · `IRN` Iran · `NZL` New Zealand |
| H | `ESP` Spain · `CPV` Cabo Verde · `KSA` Saudi Arabia · `URU` Uruguay |
| I | `FRA` France · `SEN` Senegal · `IRQ` Iraq · `NOR` Norway |
| J | `ARG` Argentina · `ALG` Algeria · `AUT` Austria · `JOR` Jordan |
| K | `POR` Portugal · `COD` DR Congo · `UZB` Uzbekistan · `COL` Colombia |
| L | `ENG` England · `CRO` Croatia · `GHA` Ghana · `PAN` Panama |

## Notes

- **Deploy the rules.** The admin write path needs the updated
  `firestore.rules` deployed (`firebase deploy --only firestore:rules`).
  Without it, adding a bracket fails with a permissions error.
- **Visibility / fairness.** Every bracket in a pool is viewable by its
  members, so an AI bracket added before the deadline can be seen (and copied)
  by players. To avoid that, add them after the submission deadline — admin AI
  writes aren't blocked by it.
- **Scoring & tiebreaker.** AI brackets are scored by the normal scorer and use
  `finalGoalsGuess` as the tiebreaker, exactly like a player's bracket.
