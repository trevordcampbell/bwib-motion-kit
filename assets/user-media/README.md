# Local media

Copy your own edited panel audio, SRT and optional logo soundtrack here.
This directory is excluded from Git except for this README.

`npm run prepare:social` writes `social-excerpt.wav` and its matching zero-based
`social-excerpt.srt` here. The imported transcript also enters `config/social.json`
and generated `templates/shared/social-data.js`; restore their demo contents before
sharing the reusable project publicly.

Download the selected [Electronic Technology Logo by BreakzStudios](https://pixabay.com/sound-effects/musical-electronic-technology-logo-185784/)
directly from Pixabay. Run `npm run prepare:sting -- assets/user-media/your-download.mp3`.
The renderer uses the resulting `logo-sting.wav` when exporting the logo opener.
The browser preview of the opener is silent; sound is muxed during export.
