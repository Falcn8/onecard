# One Card interface

The page is a game that fits the viewport. Marketing headings and scrolling content were removed at the user's request. The question-mark button opens rules, strategy, and history in an accessible dialog. The opener alternates after each completed hand, and the table footer shows who opens. Strategy tabs describe the first and second positions rather than assigning them permanently to either player. The desktop layout includes a session sidebar; a phone shows compact session statistics above the table.

The charcoal interface uses Manrope for readable UI text and the requested Agraham wordmark. The noninteractive wordmark uses 24px type on desktop and 20px on phones. A tilted orthographic Three.js camera shows a dark felt table, individually designed card faces, and separate lime and gray chip piles. Each pile displays its actual chip count. Every chip represents $1.

Numbered cards have traditional individual pip arrangements with fine gold ornaments. The ace has a decorative central spade and wreath. Jack, queen, and king use distinct mirrored court illustrations. All artwork is drawn procedurally onto Three.js canvas textures.

After each hand, the computer card flips face up, including when someone folds. A signed amount showing the current hand's net result fades and moves upward, then fades and moves downward after a brief hold. It disappears after 2.3 seconds; session totals remain in the session panel.

Keyboard controls, named card images for assistive technology, live status announcements, focus rings, native dialogs, keyboard operable strategy tabs, local storage fallback, HTML rendering fallback, and reduced motion support accompany the 3D interface.

Thirteen logic tests cover all 156 rank pairings, both computer positions and all four probability tables at their thresholds, payouts, every fold reveal, repeated actions, new hand state, history retention, opener persistence, existing-session migration, and the cancellation of positional expected values when matching role strategies alternate. Earlier browser verification includes phone and laptop layout sizes, WebGL rendering, help tabs, completed hands, card reveals after folding, session persistence, and the temporary result display. The final wordmark reduction and footer relocation have static checks; their final visual browser check was blocked when automatic approval review reached an account usage limit.
