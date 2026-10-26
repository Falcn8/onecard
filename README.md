# One Card Poker

A complete, single screen browser game using the supplied one card poker rules and original probability tables. Table, cards, chips, counts, and transient result text are rendered with Three.js 0.186.1. Betting controls remain accessible HTML buttons.

## Play

With Node.js and Python 3 installed, run `npm start` from this folder and open `http://127.0.0.1:4173`.

Run `npm run package` to create `exports/one-card-poker.html`, a personal-use standalone edition with embedded code, fonts, and Three.js, and `exports/one-card-poker-source.zip`. The standalone file can be opened directly in a modern browser. WebGL2 is needed for the 3D view; a functional HTML table remains available when WebGL is unavailable.

No package installation is required. Three.js and fonts are vendored locally. `npm start` automatically unpacks the Agraham font from its original ZIP for local use. For static hosting, run `npm run build` and serve `dist/`. Run `npm test` for the game logic checks. The build and packaging scripts use Python 3 and its standard library.

For Vercel, keep the project Root Directory at the repository root. The checked-in `vercel.json` selects the Other framework preset, runs `npm run build`, and publishes `dist/` instead of the default `public/` directory.

## Rules and controls

Both players ante $1 and draw different ranks from a 13 card suit. Check or bet $1. The opener alternates after each completed hand. When you open, the computer uses the supplied second-player probabilities. When the computer opens, it uses the supplied first-player probabilities. Facing a $1 bet, call $1 or fold. Net results are $1 after checks or folds and $2 after a called bet. All amounts are fictional.

The table shows who opens. The opponent's card reveals after every completed hand, including folds. Older history entries created before this change retain their original hidden card markers.

D deals, A checks/folds, and S bets/calls. Use the question mark for rules, both strategy tables, and the latest 100 completed hands. Sound is optional. Session totals are stored in this browser. Reset clears a session after confirmation.

## Visual behavior

The page fits the viewport without scrolling. Help and hand history can scroll inside their own panels. Your chips are lime; computer chips are gray. Each physical chip is worth $1, and each pile has an explicit count. Cards have distinct traditional pip arrangements, an ornamental ace, and individually illustrated jack, queen, and king faces.

The table displays only the current hand's gain or loss as a temporary result. It fades and moves up, holds briefly, then fades and moves down, disappearing after 2.3 seconds. Reduced motion preferences are respected.

## Files

`dist/game.js` owns the state machine. `dist/app.js` owns controls and browser storage. `dist/scene.js` owns the 3D scene and procedural card art. `dist/vendor/` contains Three.js and its MIT license. `dist/assets/` contains locally served fonts and their license notices.

The requested Agraham font is used for the top-left wordmark at 24px on desktop and 20px on phones. The wordmark is plain text and does not navigate. This font download is for personal use. Its unmodified original ZIP and license are included in `dist/assets/`. The extracted OTF and generated standalone HTML are local files excluded from Git; source archives include only the original font ZIP. Follow the included terms for redistribution and obtain the appropriate license for commercial use. Source: https://www.1001fonts.com/agraham-font.html

Generated exports and development scratch files are kept locally and excluded from Git. The repository contains the complete game source, local assets, build scripts, and tests. No hosted site deployment is included.

## Balance

The deal is uniform across all 156 distinct ordered rank pairs, and computer betting decisions use its own card and observed actions. The opener now alternates after every completed hand, so each player acts first and second once over a pair of hands. The last completed hand preserves this order across reloads; existing session totals and history are retained. Sessions from the old human-first version hand the next opening turn to the computer.

In the original fixed-order game, acting second has an advantage of about 0.064 credits per hand with strong play. Alternating positions shares that advantage. When both sides use the same strategy for their current role, the expected net results of the two positions cancel over a two-hand pair. This does not guarantee equal win rates or prevent losses from chance or weaker decisions. An odd number of hands leaves one unmatched position until the next hand is completed.

The original strategy analysis is at https://www.cs.cmu.edu/~ggordon/poker/. All four probability tables retain their original values; the computer selects the correct table for its current position.
