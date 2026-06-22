# Fonts for subtitle burn-in & hook text

For the best-looking burned-in subtitles (Karaoke Bold / Hormozi) and hook
text, drop these TrueType/OpenType fonts here:

- **Montserrat** (used by Karaoke Bold + Hormozi) — e.g. `Montserrat-Black.ttf`
- **Poppins** (used by Clean Caption) — e.g. `Poppins-ExtraBold.ttf`

Download from Google Fonts:

- https://fonts.google.com/specimen/Montserrat
- https://fonts.google.com/specimen/Poppins

Place the `.ttf` files directly in this folder:

```
public/fonts/
├── Montserrat-Black.ttf
└── Poppins-ExtraBold.ttf
```

ffmpeg/libass will pick them up via `fontsdir`. If you skip this, libass
falls back to whatever fonts are installed system-wide (results may vary).

Font files are git-ignored (licensing varies) — keep them local.
