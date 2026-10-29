# Sonora Music Player

A responsive music player built with HTML, CSS, vanilla JavaScript, and Bootstrap 5.3.8.

## Run it

Open `index.html` in a modern browser. An internet connection is needed for Bootstrap, fonts, album artwork, the iTunes music catalog, and audio previews.

## Features

- In-page audio preview playback with play/pause, next/previous, shuffle, repeat, seek, and volume controls
- Instant track switching with no artificial delay or Apple Music pop-up
- Home, Search, Your Library, Liked Songs, Late Night Chill, Deep Focus, and Good Energy views
- Search by song title, artist, album, or language
- Liked songs and recently played tracks saved in the browser
- Responsive layout with keyboard shortcuts (Space to play/pause and Ctrl/⌘ + K to search)

## Playback

The app loads song details and short playable previews from Apple's public iTunes Search API. The API does not provide full-length song files, so playback is limited to the available previews. Availability depends on Apple's catalog and your internet connection.
