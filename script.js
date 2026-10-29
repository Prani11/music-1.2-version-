let tracks = [];
const audio = document.getElementById("audio");
const trackList = document.getElementById("trackList");
const searchInput = document.getElementById("searchInput");
let currentIndex = 0, isShuffle = false, isRepeat = false, toastTimer, playbackSwitchTimer;
const liked = new Set();
let recentlyPlayed=[];try{recentlyPlayed=JSON.parse(localStorage.getItem("sonora-recent")||"[]")}catch{recentlyPlayed=[]}if(!Array.isArray(recentlyPlayed))recentlyPlayed=[];
const $ = id => document.getElementById(id);
const suggestions=document.createElement("div");suggestions.className="search-suggestions";suggestions.id="searchSuggestions";suggestions.setAttribute("role","listbox");searchInput.closest(".search-wrap").appendChild(suggestions);
const catalogQueries=[
  {language:"Telugu",country:"in",terms:["Telugu songs 2026","latest Telugu songs","Telugu film songs","Telugu movie songs 2024 2025","new Telugu singles 2024 2025"]},
  {language:"Hindi",country:"in",terms:["Hindi songs 2026","latest Bollywood songs","Hindi film songs","Hindi film songs 2024 2025","new Hindi songs 2024 2025"]},
  {language:"English",country:"us",terms:["English hits 2026","English pop songs 2025","English chart songs","English pop hits 2024 2025","English new music 2024 2025"]}
];
const cleanText=value=>(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const escapeHTML=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch]);
function appleEmbedUrl(store,country,trackId){try{const url=new URL(store);if(url.hostname==="music.apple.com"){url.hostname="embed.music.apple.com";return url.href}}catch{}return `https://embed.music.apple.com/${country}/song/${trackId}`}
function editDistance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const above=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=above}}return row[b.length]}
function searchMatches(query){const q=cleanText(query).trim();if(!q)return tracks.map((t,i)=>({t,i,score:0}));const words=q.split(/\s+/);return tracks.map((t,i)=>{const fields=cleanText(`${t.title} ${t.artist} ${t.album} ${t.language}`).split(/[^\p{L}\p{N}]+/u).filter(Boolean);let score=0;for(const word of words){let best=Infinity;for(const field of fields){if(field===word)best=0;else if(field.startsWith(word))best=Math.min(best,1);else if(field.includes(word))best=Math.min(best,2);else if(word.length>=3){const threshold=word.length<=5?1:2;for(let start=0;start<field.length;start++){const part=field.slice(start,start+word.length);if(Math.abs(part.length-word.length)<=threshold)best=Math.min(best,3+editDistance(word,part))}}}score+=best}return{t,i,score}}).filter(x=>x.score<words.length*5).sort((a,b)=>a.score-b.score||b.t.releaseDate.localeCompare(a.t.releaseDate))}
function showSuggestions(){const q=searchInput.value.trim();if(!q){suggestions.hidden=true;return}const matches=searchMatches(q).slice(0,5);suggestions.innerHTML=matches.map(({t,i})=>`<button type="button" role="option" data-play="${i}"><img src="${escapeHTML(t.cover)}" alt=""><span><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.artist)} · ${escapeHTML(t.language)}</small></span><b>▶</b></button>`).join("");suggestions.hidden=!matches.length}
const fullPlayer=document.createElement("div");fullPlayer.className="full-player-backdrop";fullPlayer.id="fullPlayer";fullPlayer.hidden=true;fullPlayer.innerHTML='<section class="full-player" role="dialog" aria-modal="true" aria-labelledby="fullPlayerTitle"><button class="full-player-close" type="button" aria-label="Close full song player">×</button><p class="eyebrow">FULL SONG PLAYER</p><h2 id="fullPlayerTitle">Listen on Apple Music</h2><p class="full-player-note">Full-length playback requires an Apple Music subscription. Sign in inside the player if prompted.</p><iframe id="fullTrackFrame" title="Apple Music full song player" allow="autoplay *; encrypted-media *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"></iframe><a id="fullTrackLink" target="_blank" rel="noopener">Open this song in Apple Music ↗</a></section>';document.body.appendChild(fullPlayer);
function openFullPlayer(index){const track=tracks[index];if(!track)return;audio.pause();currentIndex=index;$("currentTitle").textContent=track.title;$("currentArtist").textContent=track.artist;$("currentCover").src=track.cover;$("fullPlayerTitle").textContent=`${track.title} — ${track.artist}`;$("fullTrackFrame").src=track.fullUrl;$("fullTrackLink").href=track.store;fullPlayer.hidden=false;document.body.classList.add("player-open");renderTracks(getVisibleTracks())}
function closeFullPlayer(){fullPlayer.hidden=true;$("fullTrackFrame").src="about:blank";document.body.classList.remove("player-open")}
fullPlayer.addEventListener("click",e=>{if(e.target===fullPlayer||e.target.closest(".full-player-close"))closeFullPlayer()});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!fullPlayer.hidden)closeFullPlayer()});
async function loadCatalog(){trackList.innerHTML='<div class="empty-state">Loading current songs and album artwork…</div>';const requests=catalogQueries.flatMap(group=>group.terms.map(async term=>{const url=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=200&country=${group.country}`;const response=await fetch(url);if(!response.ok)throw new Error("Catalog request failed");const data=await response.json();return{group,results:data.results||[]}}));const responses=await Promise.allSettled(requests);const found=[];for(const response of responses){if(response.status!=="fulfilled")continue;const {group,results}=response.value;for(const item of results){if(!item.trackName||!item.trackId||!item.artworkUrl100||!item.releaseDate)continue;const year=Number(item.releaseDate.slice(0,4));if(year<2022)continue;const key=`${group.language}:${item.trackId}`;if(found.some(t=>t.key===key))continue;const store=item.trackViewUrl||item.collectionViewUrl;if(!store)continue;found.push({key,title:item.trackName,artist:item.artistName||"Unknown artist",album:item.collectionName||"Single",duration:timeString((item.trackTimeMillis||0)/1000),cover:item.artworkUrl100.replace("100x100bb","600x600bb").replace("100x100","600x600"),language:group.language,releaseDate:item.releaseDate,store,fullUrl:appleEmbedUrl(store,group.country,item.trackId)})}}tracks=found.sort((a,b)=>b.releaseDate.localeCompare(a.releaseDate));if(!tracks.length){trackList.innerHTML='<div class="empty-state">Could not load songs. Check your internet connection and refresh.</div>';showToast("Could not load the music catalog");return}const quick=[...document.querySelectorAll(".quick-pick")];quick.forEach((card,i)=>{const t=tracks[i];if(!t)return;card.dataset.track=i;card.querySelector("img").src=t.cover;card.querySelector("img").alt=`${t.title} cover`;card.querySelector("span").textContent=t.title;card.querySelector(".quick-play").dataset.play=i;card.querySelector(".quick-play").setAttribute("aria-label",`Play ${t.title}`)});$("currentTitle").textContent=tracks[0].title;$("currentArtist").textContent=tracks[0].artist;$("currentCover").src=tracks[0].cover;renderTracks();const counts=Object.fromEntries(catalogQueries.map(g=>[g.language,tracks.filter(t=>t.language===g.language).length]));showToast(`${counts.Telugu} Telugu · ${counts.English} English · ${counts.Hindi} Hindi songs loaded`)}
function showToast(message){const t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200)}
function saveLikes(){localStorage.setItem("sonora-liked",JSON.stringify([...liked]))}
function timeString(sec){if(!Number.isFinite(sec))return "0:00";return `${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,"0")}`}
function renderTracks(list=tracks){
  trackList.innerHTML="";
  if(!list.length){trackList.innerHTML='<div class="empty-state">No tracks found. Try another search.</div>';return}
  list.forEach(track=>{
    const i=tracks.indexOf(track), row=document.createElement("div");
    row.className="track-row"+(i===currentIndex?" playing":"");
    row.innerHTML=`<span class="track-index">${i===currentIndex&&!audio.paused?"♫":String(i+1).padStart(2,"0")}</span>
      <div class="track-info"><img src="${escapeHTML(track.cover)}" alt="${escapeHTML(track.title)} cover"><div><strong>${escapeHTML(track.title)}</strong><small>${escapeHTML(track.artist)} · ${escapeHTML(track.language)}</small></div></div>
      <span class="track-album">${escapeHTML(track.album)}</span><span class="track-duration">${escapeHTML(track.duration)}</span>
      <div class="row-actions"><button class="row-like ${liked.has(i)?"liked":""}" data-like="${i}" aria-label="Like ${escapeHTML(track.title)}">${liked.has(i)?"♥":"♡"}</button><button class="row-play" data-play="${i}" aria-label="Play ${escapeHTML(track.title)}">▶</button><a class="store-link" href="${escapeHTML(track.store)}" target="_blank" rel="noopener" aria-label="Open ${escapeHTML(track.title)} in Apple Music" title="Open in Apple Music">↗</a></div>`;
    trackList.appendChild(row);
  });
}
function updatePlayer(){
  const t=tracks[currentIndex];$("currentTitle").textContent=t.title;$("currentArtist").textContent=t.artist;$("currentCover").src=t.cover;
  $("likeCurrent").textContent=liked.has(currentIndex)?"♥":"♡";$("likeCurrent").classList.toggle("liked",liked.has(currentIndex));
  $("playBtn").textContent=audio.paused?"▶":"Ⅱ";$("playBtn").title=audio.paused?"Play":"Pause";
  renderTracks(getVisibleTracks());
}
function getVisibleTracks(){
  const query=searchInput.value.trim().toLowerCase();
  if(document.body.dataset.view==="liked")return tracks.filter((t,i)=>liked.has(i));
  if(!query){if(document.body.dataset.view==="search"){const recent=recentlyPlayed.map(id=>tracks.find(t=>t.key===id)).filter(Boolean);return recent.length?recent:tracks.slice(0,12)}return tracks}
  const matches=searchMatches(query).map(match=>match.t);if(matches.length)return matches;
  const recent=recentlyPlayed.map(id=>tracks.find(t=>t.key===id)).filter(Boolean);return recent.length?recent.slice(0,5):tracks.slice(0,5);
}
function playTrack(index){
  if(!tracks.length)return;
  const next=(index+tracks.length)%tracks.length;clearTimeout(playbackSwitchTimer);audio.pause();$("fullTrackFrame").src="about:blank";showToast("Switching songs in 1.5 seconds");playbackSwitchTimer=setTimeout(()=>{currentIndex=next;openFullPlayer(next);recentlyPlayed=[tracks[next].key,...recentlyPlayed.filter(id=>id!==tracks[next].key)].slice(0,30);localStorage.setItem("sonora-recent",JSON.stringify(recentlyPlayed));if(document.body.dataset.view==="search"&&!searchInput.value.trim())renderTracks(getVisibleTracks())},1500);
}
function toggleLike(i){if(liked.has(i))liked.delete(i);else liked.add(i);saveLikes();renderTracks(getVisibleTracks());updateLikeButton();showToast(liked.has(i)?"Added to Liked Songs":"Removed from Liked Songs")}
function updateLikeButton(){$("likeCurrent").textContent=liked.has(currentIndex)?"♥":"♡";$("likeCurrent").classList.toggle("liked",liked.has(currentIndex))}
document.addEventListener("click",e=>{
  const play=e.target.closest("[data-play]");if(play){e.stopPropagation();playTrack(Number(play.dataset.play));return}
  const like=e.target.closest("[data-like]");if(like){toggleLike(Number(like.dataset.like));return}
  const quick=e.target.closest(".quick-pick");if(quick&&!e.target.closest(".quick-play")){playTrack(Number(quick.dataset.track));return}
  const nav=e.target.closest("[data-view]");if(nav){document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n===nav));document.body.dataset.view=nav.dataset.view;
    const titles={home:"Trending right now",search:"Recently played",library:"Your library",liked:"Liked Songs",chill:"Late Night Chill",focus:"Deep Focus",energy:"Good Energy"};
    $("trackHeading").textContent=titles[nav.dataset.view]||"Trending right now";
    if(nav.dataset.view==="search")searchInput.focus();renderTracks(getVisibleTracks());return}
});
$("playBtn").addEventListener("click",()=>playTrack(currentIndex));
$("nextBtn").addEventListener("click",()=>playTrack(isShuffle?Math.floor(Math.random()*tracks.length):currentIndex+1));
$("prevBtn").addEventListener("click",()=>{if(audio.currentTime>3){audio.currentTime=0}else playTrack(currentIndex-1)});
$("shuffleBtn").addEventListener("click",()=>{isShuffle=!isShuffle;$("shuffleBtn").style.color=isShuffle?"#b7ff5a":"";showToast(isShuffle?"Shuffle on":"Shuffle off")});
$("repeatBtn").addEventListener("click",()=>{isRepeat=!isRepeat;$("repeatBtn").style.color=isRepeat?"#b7ff5a":"";audio.loop=isRepeat;showToast(isRepeat?"Repeat track on":"Repeat off")});
$("likeCurrent").addEventListener("click",()=>toggleLike(currentIndex));
$("progress").addEventListener("input",e=>{if(Number.isFinite(audio.duration))audio.currentTime=(e.target.value/100)*audio.duration});
audio.addEventListener("timeupdate",()=>{if(Number.isFinite(audio.duration)){$("progress").value=(audio.currentTime/audio.duration)*100;$("currentTime").textContent=timeString(audio.currentTime);$("duration").textContent=timeString(audio.duration)}});
audio.addEventListener("play",updatePlayer);audio.addEventListener("pause",updatePlayer);
$("volume").addEventListener("input",e=>audio.volume=Number(e.target.value));audio.volume=.7;
searchInput.addEventListener("input",()=>{document.body.dataset.view="search";const q=searchInput.value.trim();$("trackHeading").textContent=!q?"Recently played":searchMatches(q).length?"Search results":"Related songs";renderTracks(getVisibleTracks());showSuggestions()});
searchInput.addEventListener("focus",showSuggestions);searchInput.addEventListener("keydown",e=>{if(e.key==="Escape"){suggestions.hidden=true;searchInput.blur()}if(e.key==="Enter"){const first=suggestions.querySelector("[data-play]");if(first)playTrack(Number(first.dataset.play))}});document.addEventListener("click",e=>{if(!e.target.closest(".search-wrap"))suggestions.hidden=true});
$("showLiked").addEventListener("click",()=>{document.body.dataset.view="liked";$("trackHeading").textContent="Liked Songs";renderTracks(getVisibleTracks());document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view==="liked"))});
$("shuffleAll").addEventListener("click",()=>playTrack(Math.floor(Math.random()*tracks.length)));
$("seeAll").addEventListener("click",()=>{document.querySelector(".tracks-section").scrollIntoView({behavior:"smooth"});showToast("Showing all available tracks")});
$("newPlaylist").addEventListener("click",()=>{const name=prompt("Name your playlist:");if(name&&name.trim())showToast(`“${name.trim()}” playlist idea saved for this session`)});
$("queueBtn").addEventListener("click",()=>showToast("Up next: "+tracks[(currentIndex+1)%tracks.length].title));
$("goBack").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));$("goForward").addEventListener("click",()=>document.querySelector(".tracks-section").scrollIntoView({behavior:"smooth"}));
document.addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();searchInput.focus()}if(e.code==="Space"&&!["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("playBtn").click()}});
$("currentTitle").textContent="Loading music…";$("currentArtist").textContent="Apple Music catalog";$("currentCover").removeAttribute("src");$("audio").addEventListener("error",()=>showToast("This preview is unavailable. Try another song."));loadCatalog();
