# RIMVISUALS — original full-resolution gameplay screenshots

The repository page now references the following **9 original 1600×900 WebP screenshots**, which were provided by the user in ChatGPT. They are ready in the conversation artifact `rimvisuals-site-screenshots.zip`.

The images have **not yet been committed as binary files to GitHub**, so this branch MUST NOT be merged until all nine files are uploaded under this directory. Do not regenerate compressed 230×130 SVG previews.

Required files (keep original .webp contents and names):

- china-hat.webp
- pvp-hitbox.webp
- clickgui.webp
- hw-helper.webp
- custom-fog.webp
- pvp-effects.webp
- keybinds.webp
- helper-settings.webp
- hud.webp

The ChatGPT asset ZIP already has exactly the correct folder structure: `assets/screenshots/*.webp`. Extract it, and upload all nine images using GitHub **Add file → Upload files** on this branch, in directory `assets/screenshots/`. Preserve filenames. Each image must return HTTP 200 at `https://rimvisuals.vercel.app/assets/screenshots/<name>.webp` after deployment, and images must load in the hero feature gallery and lightbox. 

This PR edits only the static screenshot gallery and CSS; it does not change payment or authentication. Pricing remains informational. No paid access enabled.
