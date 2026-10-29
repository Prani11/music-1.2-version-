let tracks = [];
const audio = document.getElementById("audio");
const trackList = document.getElementById("trackList");
const searchInput = document.getElementById("searchInput");
const $ = id => document.getElementById(id);
let currentIndex = 0, isShuffle = false, isRepeat = false, toastTimer;
let liked = new Set();
try { liked = new Set(JSON.parse(localStorage.getItem("sonora-liked") || "[]")); } catch {}
let recentlyPlayed = [];
try { recentlyPlayed = JSON.parse(localStorage.getItem("sonora-recent") || "[]"); } catch {}
if (!Array.isArray(recentlyPlayed)) recentlyPlayed = [];

const catalogQueries = [
  { language: "Telugu", country: "in", terms: ["Telugu songs 2026", "latest Telugu songs", "Telugu film songs", "Telugu movie songs 2024 2025"] },
  { language: "Hindi", country: "in", terms: ["Hindi songs 2026", "latest Bollywood songs", "Hindi film songs", "Hindi film songs 2024 2025"] },
  { language: "English", country: "us", terms: ["English hits 2026", "English pop songs 2025", "English chart songs", "English new music 2024 2025"] }
];
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const cleanText = value => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function timeString(sec) { return Number.isFinite(sec) ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}` : "0:00"; }
function showToast(message) { const t = $("toast"); t.textContent = message; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200); }
function searchMatches(query) {
  const q = cleanText(query).trim();
  if (!q) return tracks;
  return tracks.filter(t => cleanText(`${t.title} ${t.artist} ${t.album} ${t.language} ${t.genre}`).includes(q));
}

function playlistTracks(key) {
  const patterns = {
    chill: /chill|acoustic|ambient|soft|romantic|melody|lofi|lo-fi|indie/i,
    focus: /instrumental|classical|ambient|piano|soundtrack|focus|electronic/i,
    energy: /dance|pop|rock|hip.?hop|electronic|party|workout/i
  };
  const matching = tracks.filter(t => patterns[key]?.test(`${t.genre} ${t.title} ${t.album}`));
  if (matching.length) return matching;
  const offsets = { chill: 0, focus: 1, energy: 2 };
  return tracks.filter((_, i) => i % 3 === offsets[key]);
}
function getVisibleTracks() {
  const view = document.body.dataset.view || "home", query = searchInput.value.trim();
  if (view === "liked") return tracks.filter((_, i) => liked.has(i));
  if (["chill", "focus", "energy"].includes(view)) return playlistTracks(view);
  if (view === "library") {
    const recent = recentlyPlayed.map(key => tracks.find(t => t.key === key)).filter(Boolean);
    return [...new Set([...recent, ...tracks.filter((_, i) => liked.has(i))])];
  }
  if (view === "search") return query ? searchMatches(query) : recentlyPlayed.map(key => tracks.find(t => t.key === key)).filter(Boolean);
  return query ? searchMatches(query) : tracks;
}
function renderTracks(list = getVisibleTracks()) {
  trackList.innerHTML = "";
  if (!list.length) {
    const message = document.body.dataset.view === "liked" ? "Like a song and it will appear here." : document.body.dataset.view === "search" ? "Search for a song, artist, album, or language." : "No songs here yet. Try another view or search.";
    trackList.innerHTML = `<div class="empty-state">${message}</div>`; return;
  }
  list.forEach((track, position) => {
    const i = tracks.indexOf(track), row = document.createElement("div");
    row.className = "track-row" + (i === currentIndex && !audio.paused ? " playing" : "");
    row.innerHTML = `<span class="track-index">${i === currentIndex && !audio.paused ? "♫" : String(position + 1).padStart(2, "0")}</span>
      <div class="track-info"><img src="${escapeHTML(track.cover)}" alt="${escapeHTML(track.title)} cover"><div><strong>${escapeHTML(track.title)}</strong><small>${escapeHTML(track.artist)} · ${escapeHTML(track.language)}</small></div></div>
      <span class="track-album">${escapeHTML(track.album)}</span><span class="track-duration">${escapeHTML(track.duration)}</span>
      <div class="row-actions"><button class="row-like ${liked.has(i) ? "liked" : ""}" data-like="${i}" aria-label="Like ${escapeHTML(track.title)}">${liked.has(i) ? "♥" : "♡"}</button><button class="row-play" data-play="${i}" aria-label="Play ${escapeHTML(track.title)}">▶</button></div>`;
    trackList.appendChild(row);
  });
}
function updatePlayer() {
  const t = tracks[currentIndex]; if (!t) return;
  $("currentTitle").textContent = t.title; $("currentArtist").textContent = t.artist; $("currentCover").src = t.cover;
  $("likeCurrent").textContent = liked.has(currentIndex) ? "♥" : "♡";
  $("likeCurrent").classList.toggle("liked", liked.has(currentIndex));
  $("playBtn").textContent = audio.paused ? "▶" : "Ⅱ"; $("playBtn").title = audio.paused ? "Play" : "Pause";
  renderTracks();
}
async function playTrack(index) {
  if (!tracks.length) return;
  const next = (index + tracks.length) % tracks.length, track = tracks[next];
  if (!track.previewUrl) { showToast("A playable preview is not available for this song."); return; }
  currentIndex = next;
  if (audio.src !== track.previewUrl) { audio.src = track.previewUrl; audio.currentTime = 0; }
  updatePlayer();
  recentlyPlayed = [track.key, ...recentlyPlayed.filter(key => key !== track.key)].slice(0, 30);
  localStorage.setItem("sonora-recent", JSON.stringify(recentlyPlayed));
  try { await audio.play(); } catch { showToast("Playback was blocked. Press play to start the preview."); }
}
function saveLikes() { localStorage.setItem("sonora-liked", JSON.stringify([...liked])); }
function toggleLike(i) {
  liked.has(i) ? liked.delete(i) : liked.add(i); saveLikes(); renderTracks();
  if (i === currentIndex) updatePlayer();
  showToast(liked.has(i) ? "Added to Liked Songs" : "Removed from Liked Songs");
}

const viewInfo = {
  home: ["Trending right now", "The newest tracks from your catalog"],
  search: ["Search results", "Find songs by title, artist, album, or language"],
  library: ["Your library", "Recently played and songs you have saved"],
  liked: ["Liked Songs", "All the tracks you have saved"],
  chill: ["Late Night Chill", "Soft sounds for slower moments"],
  focus: ["Deep Focus", "Find your flow state"],
  energy: ["Good Energy", "Turn up the brightness"]
};
function navigate(view) {
  document.body.dataset.view = view;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === view));
  const [title, subtitle] = viewInfo[view] || viewInfo.home;
  $("trackHeading").textContent = title;
  let note = document.getElementById("viewNote");
  if (!note) { note = document.createElement("p"); note.id = "viewNote"; note.className = "view-note"; $("trackHeading").after(note); }
  note.textContent = subtitle;
  const home = view === "home";
  document.querySelector("#welcome").hidden = !home;
  document.querySelector(".quick-picks").hidden = !home;
  document.querySelector(".content-section:not(.tracks-section)").hidden = !home;
  $("seeAll").hidden = !home;
  trackList.closest(".track-table").scrollIntoView({ behavior: "smooth", block: "nearest" });
  renderTracks();
}

async function loadCatalog() {
  trackList.innerHTML = '<div class="empty-state">Loading songs…</div>';
  const requests = catalogQueries.flatMap(group => group.terms.map(async term => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=200&country=${group.country}`;
    const response = await fetch(url); if (!response.ok) throw new Error("Catalog request failed");
    return { group, results: (await response.json()).results || [] };
  }));
  const responses = await Promise.allSettled(requests), found = new Map();
  for (const response of responses) {
    if (response.status !== "fulfilled") continue;
    const { group, results } = response.value;
    for (const item of results) {
      if (!item.trackName || !item.trackId || !item.artworkUrl100 || !item.previewUrl) continue;
      const key = `${group.language}:${item.trackId}`;
      if (found.has(key)) continue;
      found.set(key, { key, title: item.trackName, artist: item.artistName || "Unknown artist", album: item.collectionName || "Single",
        duration: timeString((item.trackTimeMillis || 0) / 1000), cover: item.artworkUrl100.replace("100x100bb", "600x600bb").replace("100x100", "600x600"),
        language: group.language, genre: item.primaryGenreName || "", releaseDate: item.releaseDate || "", store: item.trackViewUrl || "", previewUrl: item.previewUrl });
    }
  }
  tracks = [...found.values()].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  if (!tracks.length) { trackList.innerHTML = '<div class="empty-state">Could not load playable previews. Check your connection and refresh.</div>'; return; }
  document.querySelectorAll(".quick-pick").forEach((card, i) => {
    const track = tracks[i]; if (!track) return;
    card.dataset.track = i; card.querySelector("img").src = track.cover; card.querySelector("img").alt = `${track.title} cover`;
    card.querySelector("span").textContent = track.title; card.querySelector(".quick-play").dataset.play = i;
  });
  updatePlayer();
}

document.addEventListener("click", event => {
  const play = event.target.closest("[data-play]"); if (play) { event.stopPropagation(); playTrack(Number(play.dataset.play)); return; }
  const like = event.target.closest("[data-like]"); if (like) { toggleLike(Number(like.dataset.like)); return; }
  const quick = event.target.closest(".quick-pick"); if (quick) { playTrack(Number(quick.dataset.track)); return; }
  const nav = event.target.closest("[data-view]"); if (nav) { navigate(nav.dataset.view); if (nav.dataset.view === "search") searchInput.focus(); }
});
$("playBtn").addEventListener("click", () => audio.paused ? playTrack(currentIndex) : audio.pause());
$("nextBtn").addEventListener("click", () => playTrack(isShuffle ? Math.floor(Math.random() * tracks.length) : currentIndex + 1));
$("prevBtn").addEventListener("click", () => audio.currentTime > 3 ? audio.currentTime = 0 : playTrack(currentIndex - 1));
$("shuffleBtn").addEventListener("click", () => { isShuffle = !isShuffle; $("shuffleBtn").style.color = isShuffle ? "#b7ff5a" : ""; showToast(isShuffle ? "Shuffle on" : "Shuffle off"); });
$("repeatBtn").addEventListener("click", () => { isRepeat = !isRepeat; audio.loop = isRepeat; $("repeatBtn").style.color = isRepeat ? "#b7ff5a" : ""; showToast(isRepeat ? "Repeat track on" : "Repeat off"); });
$("likeCurrent").addEventListener("click", () => toggleLike(currentIndex));
$("progress").addEventListener("input", event => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(event.target.value) / 100 * audio.duration; });
audio.addEventListener("timeupdate", () => {
  if (!Number.isFinite(audio.duration)) return;
  $("progress").value = audio.currentTime / audio.duration * 100; $("currentTime").textContent = timeString(audio.currentTime); $("duration").textContent = timeString(audio.duration);
});
audio.addEventListener("play", updatePlayer); audio.addEventListener("pause", updatePlayer);
audio.addEventListener("ended", () => { if (!isRepeat) playTrack(isShuffle ? Math.floor(Math.random() * tracks.length) : currentIndex + 1); });
audio.addEventListener("error", () => showToast("This preview is unavailable. Try another song."));
$("volume").addEventListener("input", event => audio.volume = Number(event.target.value)); audio.volume = .7;
searchInput.addEventListener("input", () => { if (document.body.dataset.view !== "search") navigate("search"); else renderTracks(); });
$("showLiked").addEventListener("click", () => navigate("liked"));
$("shuffleAll").addEventListener("click", () => playTrack(Math.floor(Math.random() * tracks.length)));
$("seeAll").addEventListener("click", () => { document.querySelector(".tracks-section").scrollIntoView({ behavior: "smooth" }); });
$("newPlaylist").addEventListener("click", () => showToast("Playlist creation is coming soon."));
$("queueBtn").addEventListener("click", () => { if (tracks.length) showToast(`Up next: ${tracks[(currentIndex + 1) % tracks.length].title}`); });
$("goBack").addEventListener("click", () => navigate("home")); $("goForward").addEventListener("click", () => navigate("library"));
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchInput.focus(); }
  if (event.code === "Space" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); $("playBtn").click(); }
});
searchInput.closest(".search-wrap").querySelector("kbd").textContent = "⌘ K";
$("currentTitle").textContent = "Loading songs…"; $("currentArtist").textContent = "Sonora preview player";
loadCatalog();
