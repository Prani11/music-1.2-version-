# Sonora Music Web App

A responsive, no-sign-in music player built with HTML, custom CSS, vanilla JavaScript, and Bootstrap 5.3.8.

## Run it
1. Extract `sonora_music_app.zip`.
2. Open `index.html` in a modern browser.
3. Internet access is needed for the demo audio tracks, cover photos, and Google Fonts.

## Features
- Responsive music dashboard with a live catalog of recent Telugu, Hindi, and English songs
- Search by song, artist, album, or language, with up to four live suggestions while typing
- Album artwork, Apple Music full-track embeds, and direct store links
- Play/pause, next/previous, shuffle, repeat, seek, and volume controls
- Spacebar play/pause and Ctrl/⌘ + K search shortcut

## Music catalog
The app requests current song metadata from Apple's public iTunes Search API when it opens. It keeps results released from 2022 onward and sorts newest first. The full-song player uses Apple's embeddable player. Listeners signed in with an Apple Music subscription can hear full tracks there; listeners without access may hear a short preview or be prompted to sign in or subscribe. Search suggestions tolerate common typos, and an empty Search view shows recent plays (or the newest songs before anything has been played). Track changes include a 1.5-second gap. Catalog size depends on Apple's current search results and internet access.

Bootstrap CSS and its JavaScript bundle load from jsDelivr, so an internet connection is needed for those assets as well as catalog data and previews.
