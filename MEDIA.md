# Private Media Requirements

Media is intentionally excluded from this public source export. Do not fetch,
scrape or redistribute the live site's assets as a substitute for permission.
Ask the project's owner for authorized development assets.

Expected local paths, preserving capitalization/spaces:

- `icon.png`: production avatar/favicon.
- `game/assets/*.png`: room backgrounds and floor layers.
- `game/assets/ui/`: wordmark and illustrated UI/gameplay icons.
- `game/assets/opening-voice/{sa,ga,su}.wav`: opening syllables.
- `game art from illustrator/openingnew.mp4`: mandatory intro.
- `game art from illustrator/background before game.jpg`: lobby scene.
- `game art from illustrator/opening backsound.mp3`, `beforegame.mp3` and
  `backsound.mp3`: music phases.
- `game art from illustrator/`: frame sequences for idle, sofa, reactions,
  eating, bathing, sleep/wake and catch animations.
- `website sagasu/assets/gallery/expressions/expression8.png` and
  `website sagasu/assets/gallery/poses/pose10.png`: fallback character images.

For exact frame paths/prefixes/counts, inspect `artist-animation.js`; CSS and
`care.js` also reference bathroom sequences and background art. Do not create
large binary commits. The root ignore rules exclude bitmap/audio/video files.

The Android source export substitutes a neutral XML vector launcher, so debug
compilation does not depend on the private launcher bitmap. This does not
replace production game artwork or modify the installed/store APK.
