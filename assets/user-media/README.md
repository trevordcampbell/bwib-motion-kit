# Local media

Copy your own edited panel audio, SRT and optional logo soundtrack here.
This directory is excluded from Git except for this README.

Download the selected [Electronic Technology Logo by BreakzStudios](https://pixabay.com/sound-effects/musical-electronic-technology-logo-185784/)
directly from Pixabay. Run `npm run prepare:sting -- assets/user-media/your-download.mp3`.
The renderer uses the resulting `logo-sting.wav` when exporting the logo opener.
The browser preview of the opener is silent; sound is muxed during export.
