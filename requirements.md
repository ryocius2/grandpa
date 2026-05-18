# Harold "Boyce" Krusemark - Military Service Visualization

## Overview

Interactive web application visualizing the military service of 2nd Lt. Harold E. Krusemark across WWII (Europe & Pacific) and the Korean War, 1942-1952. Built with Python/Flask and CesiumJS.

**Target audience:** Family members, varying technical comfort levels.

---

## 1. Data Foundation

### 1.1 Data Architecture — Two CZML Files
- **`personal_czml.json`** — Harold's journey: 24 chronological events with coordinates, dates, labels, descriptions, quotes, and source citations
- **`world_czml.json`** — Historical context: war events, frontlines, key battles, city liberations — anything that provides "what was happening around him"
- **`events.json`** — Enriched flat data with source citations, unit roles, and world events (used for info panel content, not Cesium rendering)

Both CZML files share the same clock/timeline so they stay synchronized on the globe.

### 1.2 Source Documents (in `/datasources`)
- **HEK Veteran Information** — Harold's own written account (primary source)
- **Co M 303 Reg 97th Inf** — Lt. Elliot Gatner's Company M narrative (secondary source) - served with Harold Krusemark
- **HEK Bronze Star** — Bronze Star Medal citation for service 22 Mar - 16 Jun 1945 - awarded for Lt. Krusemark's section destroying an 88mm battery and taking 61 prisoners on or about Apr 11-17, 1945 in the Ruhr Pocket.

### 1.3 Source Precedence
1. `/datasources` (Harold's account, Bronze Star citation)
2. Unit histories (97th Infantry Division, 15th Infantry Regiment / 3rd Division)
3. Unofficial histories (Gatner narrative, secondary accounts)
4. Inferred / researched (must be cited)

### 1.4 Korean War Research
Harold's Korean War sources are thinner than WWII. Supplement with:
- 15th Infantry Regiment / 3rd Infantry Division unit histories (Chorwon Valley, 1951-1952)
- 3rd Division operations in the Iron Triangle area
- 4.2" Chemical Mortar Company records if available
- Cite all added content with source type per 1.3 precedence

**Known Korean War context from research:**
- 3rd Infantry Division held a sector of the Jamestown Line in Chorwon Valley / Iron Triangle throughout 1952
- By mid-1952, war had settled into static positional warfare with constant mortar/artillery duels
- Chinese forces steadily increased mortar and artillery fire through summer 1952 (45,000 rounds against Eighth Army in September 1952 alone)
- Harold's 4.2" Chemical Mortar Platoon received the new M30 mortar in July 1952 (range increased from 3,900 to 5,900 yards)
- Harold mentioned a major enemy mortar attack roughly a month before heading home (~July-August 1952) — likely one of the escalating Chinese probing attacks and mortar barrages along the 3rd Division's Jamestown Line sector
- Key nearby engagements: Outpost Kelly (Sept 17-24, 1952, 65th Infantry / 3rd Division), Battle of Old Baldy (Oct 1952, nearby sector)

---

## 2. Map & Visualization

### 2.1 CesiumJS Globe
- Full 3D globe with terrain
- **Guided camera** — camera follows Harold's position, no free pan/zoom by user (see 3.6)
- Smooth transitions between event locations
- **Cesium Ion free community tier** for terrain/imagery tiles (sufficient for family-scale traffic)

### 2.2 Color Scheme — Military Standard
All map elements follow military map conventions:
- **Blue** — Friendly forces (Harold's path, Allied positions, friendly events)
- **Red** — Hostile forces (enemy positions, Axis/Chinese frontlines, hostile events)
- **Green** — Victory/milestone events (V-E Day, Japanese Surrender, separations)
- **Gold/Yellow** — Harold's personal markers (his position dot, event labels)

### 2.3 Event Points
Each event point displays on click/hover:
- **Title** (from label text)
- **Date(s)**
- **Description** with historical context
- **Images** — up to 2 per card (see 2.6)
- **Source link** — to `/datasources` document or external URL
- **Unit/Role** at that point in time
- **Attributed quote** — Harold's own words (with rank at that time), or Gatner's, or unit historian's, with clear attribution

### 2.4 Travel Visualization Between Points
Show mode of transport between events:

| Segment | Mode | Visual |
|---------|------|--------|
| US domestic (Peoria -> Camp Grant -> Fort Bragg, etc.) | Train/rail | Train icon along route |
| Camp Cooke, CA -> New York POE | Freight train | Train icon (he was literally train commander in a caboose) |
| New York -> Le Havre, France | Ship — **USS Monticello** | Ship icon, ocean route |
| Within Europe (France -> Germany -> Czechoslovakia) | Motor convoy / on foot | Truck/walking icon |
| Europe -> New York (return) | Ship | Ship icon |
| Seattle -> Ulithi -> Leyte -> Yokohama | Ship — **USS General John Pope** | Ship icon, Pacific route with waypoints |
| Japan domestic (Yokohama -> Kumagaya) | Electric train | Train icon (per Gatner) |
| Japan -> Camp McCoy (return) | Ship | Ship icon |
| Fort Sheridan -> Yokohama (Korea era) | Ship/air | Ship or plane icon |
| Yokohama -> Korea | Ship | Ship icon |
| Korea -> Fort Sheridan (return) | Ship | Ship icon |

### 2.5 Frontline Overlay (Toggleable Layer)
**WWII European Theater:**
- Time-enabled frontline traces showing Allied (blue) / Axis (red) lines
- Frontlines animate with timeline to show progression
- Critical period: March-May 1945 when Harold is in Germany/Czechoslovakia
- Potential data sources:
  - Library of Congress WWII Military Situation Maps
  - OpenHistoricalMap
  - Harvard WorldMap
  - github.com/sashagavrilov/ww2-frontlines

**Korean War:**
- 38th parallel and frontline positions around Chorwon Valley / Iron Triangle
- Jamestown Line position held by 3rd Infantry Division
- Focus on 1951-1952 period when Harold was deployed
- Based on 3rd Infantry Division / 15th Infantry Regiment operational maps

Both layers toggleable on/off independently.

### 2.6 Images — Configurable, 2 Per Card
Each event card supports **up to 2 images**, configured via a JSON image manifest:

```json
{
  "event_id": "event_14_ruhr_hilden",
  "images": [
    { "src": "/pictures/artillery.png", "caption": "Mortar operations", "type": "personal" },
    { "src": "/datasources/HEK Bronze Star.pdf", "caption": "Bronze Star Citation", "type": "document" }
  ]
}
```

**Image sourcing priority:**
1. Personal/family photos from `/pictures/` (matched by timeline)
2. Unit insignia (public domain US Army patches): 35th Division, 100th Division, 97th "Trident", 3rd Infantry Division
3. Period photographs of bases, battles, locations
4. Battle maps

**Current `/pictures/` mapping:**
- `training.png` -> training phase events (events 1-9)
- `artillery.png` -> artillery/mortar events (events 3, 4, 13, 14, 23)
- `japan.png` -> Japan occupation events (events 19, 20)
- `korea.png` -> Korean War events (events 22, 23, 24)

**Design for easy updates:** Adding a new photo = drop file in `/pictures/`, update image manifest JSON. No code changes needed.

### 2.7 World Events — Hybrid Display (A+B)

**A — Info Panel Context (always):**
- Info panel always shows concurrent world events active at the same time as the displayed personal event
- Pulled from `world_czml.json` events whose availability overlaps current time

**B — Travel Overlay Moments (critical events only):**
- During travel animation between Harold's stops, a handful of pivotal world events trigger brief overlay notifications on the globe
- These are NOT full stops — they flash as a banner/card during the travel animation (3-5 seconds), then fade
- Reserved for moments where history directly intersects Harold's path

**Travel overlay moments:**
| World Event | During Travel Between | Why It Matters |
|-------------|----------------------|----------------|
| D-Day / Normandy (Jun 6, 1944) | Fort Bragg -> Fort Benning | Massive infantry casualties drive his retraining from artillery to infantry |
| Battle of the Bulge (Dec 1944) | Camp Cooke preparation | 89,000 US casualties; reinforces why artillery officers are being retrained as infantry |
| Hiroshima (Aug 6, 1945) | Seattle -> Japan | Dropped while Harold is mid-Pacific, sailing toward invasion |
| Nagasaki (Aug 9, 1945) | Seattle -> Japan | Second bomb, 3 days later, still at sea |
| Japanese Surrender (Aug 14, 1945) | Seattle -> Japan | Operation Downfall cancelled — Harold's division becomes occupation force instead of invasion force (see 5.3) |

**Standard world events (info panel only):**
- V-E Day, Ruhr Pocket collapse, Rhine crossings, Operation Downfall cancellation
- Korean War: 3rd Division engagements, Iron Triangle operations, Outpost Kelly, armistice negotiations
- Rendered on globe in red (hostile) or green (Allied victory) per 2.2 color scheme

---

## 3. Navigation & Interaction

### 3.1 Two Modes
- **Explore Mode** — Click event-to-event, read at own pace. Camera flies to selected event but remains guided (no free pan/zoom).
- **Story Mode** — Animated playback following Harold's journey chronologically, with narration cards

### 3.2 Story Mode — Narration Cards
At each event stop, display a narration card with:
- Attributed quote from Harold (with rank at that time, e.g. *"2nd Lt. Harold 'Boyce' Krusemark"*), or from Lt. Gatner, or from unit historians
- Event description, images, context
- Dwell time per card configured in `story_config.json` (backend config only, not adjustable in UI)
- Default dwell time: 8 seconds (adjustable per-card in config file)

### 3.3 Story Mode Controls
- Play / Pause
- Next / Previous event (skip forward/back)
- Speed multiplier: 1x, 1.5x, 2x
- Progress indicator showing timeline position

### 3.4 Timeline
- Visual timeline bar/sidebar showing all events
- Click any event to jump directly to it
- Highlight current position
- War phase segments differentiated by **alternating gray shades** (not color-coded by theater)
  - Phase labels: Training, ETO, Pacific/Occupation, Korea

### 3.5 Info Panel
- Side panel or popup showing event details when selected
- Image display area (2 images)
- Attributed quote block
- Source citation with links
- "What was happening in the war" context section (pulled from `world_czml.json` events active at same time)

### 3.6 Camera Control — Guided, No Free Pan/Zoom
- **User cannot freely pan or zoom the globe.** Camera is always guided.
- In **Explore Mode**: clicking an event flies the camera to that location at an appropriate altitude
- In **Story Mode**: camera follows Harold automatically
- During **travel animation**: camera zooms out enough to show the origin, destination, and any nearby world events, then zooms back in on arrival
- Slight zoom variance allowed — close enough to see terrain detail at a stop, wide enough during travel to show context
- Disable default Cesium mouse/touch interaction (drag, scroll zoom, right-click tilt)

---

## 4. Video Export

### 4.1 Built-in Video Export
- Record Story Mode playback directly to video file
- Uses browser MediaRecorder API to capture the Cesium canvas + UI overlay
- Output format: WebM (browser-native) or MP4 via client-side encoding

### 4.2 Dwell Time Configuration (Backend Only)
Per-card dwell time stored in `story_config.json` — edited directly, not via UI:

```json
{
  "default_dwell_seconds": 8,
  "travel_speed_multiplier": 1.0,
  "events": {
    "event_01_induction": { "dwell_seconds": 10 },
    "event_14_ruhr_hilden": { "dwell_seconds": 15 },
    "event_18_seattle_pacific": { "dwell_seconds": 12 },
    "event_24_fort_sheridan_final": { "dwell_seconds": 12 }
  }
}
```

### 4.3 Presentation Mode
- Toggle to hide all UI chrome (controls, timeline, panels)
- Full-screen globe with only narration cards overlaid
- Clean output for video recording/export
- Fade transitions between cards

---

## 5. Special Content

### 5.1 Bronze Star Event (event_14)
- Prominent display of Bronze Star citation
- Image of the actual PDF document
- Full Gatner account of the action at Hilden
- Extended dwell time in Story Mode
- Quote: *"Lt. Krusemark's section destroyed a combined 88mm anti-aircraft and searchlight battery. As a result, about 61 prisoners were taken."* — Lt. Elliot Gatner

### 5.2 Key Narrative Moments
- Near-miss at Sieg River: shell fragment story from Gatner — *"if that shell fragment had hit either of us, it would have sliced us in half"*
- Church steeple reconnaissance with Krusemark and Gatner
- Train commander across US in a freight caboose
- War ending 10 miles from Pilsen
- Orientation flight in army transport planes in Japan
- Korean War: white phosphorus fire support and defensive holding actions
- Korean War: major enemy mortar attack ~July-August 1952, roughly a month before heading home

### 5.3 Operation Downfall — "What Was Supposed to Happen"
This deserves special narrative treatment during the Seattle -> Japan travel segment:

**The plan:** Operation Downfall was the two-phase Allied invasion of Japan:
- **Operation Olympic** (November 1945) — Invasion of southern Kyushu
- **Operation Coronet** (Spring 1946) — Invasion of Honshu, south of Tokyo. The 97th Infantry Division was designated as a **reserve force** for this phase — the invasion of the Kanto Plain.

**The scale:** Seven times the size of Normandy. Nearly a million personnel. Casualty estimates: hundreds of thousands of Americans.

**What actually happened:** The atomic bombs were dropped on Hiroshima (Aug 6) and Nagasaki (Aug 9) while Harold and the 97th Division were mid-Pacific, having sailed from Seattle on August 30. Japan surrendered on August 14 (before they sailed) but the division still proceeded — arriving at Yokohama on September 25, 1945, as **occupation forces instead of an invasion force**.

**The detail that brings it home:** When the 97th arrived at Yokohama, soldiers observed three rows of trenches dug along the shoreline — the defenses Japanese forces had prepared to oppose the invasion. Division veterans who saw these defenses believed "many more Japanese and Allied lives would have been lost if the planned Allied invasion of Japan had taken place."

**Display:** During the Seattle -> Yokohama travel animation, show the atom bomb overlay events, then a narration card explaining what was supposed to happen vs. what did. This is one of the most powerful moments in the story — Harold was sailing toward an invasion that would likely have killed him. The 97th Division was slated for Operation Coronet, the invasion of Honshu south of Kyoto.

### 5.4 Near-Miss Moments Throughout Service
Harold's career contains a series of close brushes with history. These should be noted in relevant event descriptions:

| Event | Near-Miss | Context |
|-------|-----------|---------|
| Camp Rucker / 35th Division | 35th Division deployed to Normandy (Omaha Beach, Jul 1944), fought through France, Battle of the Bulge | Harold transferred out before deployment. Men he trained alongside fought in Normandy and beyond. |
| Fort Bragg / 100th Division | 100th Division deployed Oct 1944, fought 185 consecutive days in Vosges Mountains | 100th shed 14,636 enlisted + 1,400 officers during training. Harold was one of those transferred out. |
| Fort Benning retraining | Massive infantry officer casualties in Europe | Harold retrained from artillery to infantry specifically because so many infantry officers were being killed. |
| Camp Cooke / 97th Division | 97th arrived in Europe Mar 1945, saw 41 days of intense combat | Late arrival meant less exposure, but the fighting was fierce — Ruhr Pocket, Czechoslovakia. |
| Seattle -> Japan | Operation Downfall (see 5.3) | Sailing toward invasion of Japan; atom bombs dropped; became occupation force. |
| Korea, summer 1952 | Escalating Chinese mortar/artillery attacks | Major enemy mortar attack ~1 month before rotation home. |

### 5.5 Korean War — Major Enemy Mortar Attack
Harold mentioned a major enemy mortar attack roughly a month before heading home from Korea. Based on his separation date (September 17, 1952), this places the attack in approximately July-August 1952.

**Context:** By mid-1952, Chinese forces were steadily escalating mortar and artillery fire along the Jamestown Line. The 3rd Infantry Division's outpost line — manned by squad- to company-sized forces on low-lying hills — was under near-constant bombardment. In September 1952 alone, Chinese forces fired 45,000 rounds against the Eighth Army front, building toward the largest artillery volumes of the entire war by October 1952.

**Source:** HEK Veteran Information (primary, reference to mortar attack); 3rd Infantry Division operational records, 1952 (unit history).

---

## 6. Technical Architecture

### 6.1 Stack
- **Backend:** Python / Flask
- **Frontend:** CesiumJS (3D globe), HTML/CSS/JS
- **Data:** JSON — `personal_czml.json`, `world_czml.json`, `events.json`, `image_manifest.json`, `story_config.json`
- **Terrain/Imagery:** Cesium Ion free community tier

### 6.2 Configuration Files (all JSON, no code changes needed)
| File | Purpose |
|------|---------|
| `personal_czml.json` | Harold's events, positions, path |
| `world_czml.json` | Historical context events, frontlines |
| `image_manifest.json` | Per-event image assignments (up to 2 per card) |
| `story_config.json` | Dwell times, travel speed, presentation settings |

### 6.3 Deployment — Raspberry Pi
- Flask serves static assets + JSON files
- CesiumJS rendering happens client-side (visitor's browser does heavy lifting)
- Pre-process all heavy data (frontline GeoJSON, etc.) at build time
- Cesium Ion free tier handles terrain/imagery tile serving (offloads from Pi)
- Compress images, lazy-load where possible
- Total asset budget: keep under 50MB for fast Pi serving

### 6.4 Video Export Architecture
- Client-side recording via MediaRecorder API (no server load on Pi)
- Canvas capture of Cesium viewer + DOM overlay for narration cards
- Export as WebM natively; optional ffmpeg.wasm for MP4 conversion
- Recording controls: start, stop, resolution selection

---

## 7. Research — To Be Done During Build

All research is developer responsibility (not user). User verifies accuracy and adds family photos.

- [ ] Ship name for Japan -> US return trip (1946) and Korea-era crossings
- [ ] More precise dates for some training-phase events (currently approximate)
- [ ] Period photographs of specific bases (Camp Grant, Fort Sill, Camp Rucker, Camp Cooke, etc.)
- [ ] Unit insignia images: 97th "Trident", 35th Division, 100th Division, 3rd Infantry Division
- [ ] Frontline GeoJSON data — evaluate which source provides best time-indexed data for WWII
- [ ] Korean War frontline data — 3rd Division / Iron Triangle / Jamestown Line, 1951-1952
- [ ] 15th Infantry Regiment / 3rd Division operational history for Chorwon Valley period
- [ ] 4.2" Chemical Mortar Company records (Korean War period)
- [ ] Details on major enemy mortar attack, July-August 1952, 3rd Division sector
- [ ] Additional family photos with date/location identification (user provides)
- [ ] Japanese shoreline defenses at Yokohama — photos or descriptions for Operation Downfall card

---

## Appendix A: Known Ship Names

From source documents and research:
- **USS Monticello** — New York to Le Havre (departed Feb 19, 1945, arrived Mar 2-3, 1945)
- **USS General John Pope** — Seattle to Pacific (departed Aug 30, 1945), routed through Ulithi, Leyte, then Yokohama (arrived ~Sep 25, 1945)

---

## Appendix B: Unit Assignments Timeline

| Period | Unit | Role | Division |
|--------|------|------|----------|
| Oct 1942 | U.S. Army | Inducted | — |
| Late 1942 - Mid 1943 | Field Artillery | Trainee, then Instructor | Fort Bragg |
| Mid 1943 | Field Artillery OCS | Officer Candidate | Fort Sill |
| Mid-Late 1943 | Service Battery, 161st FA | Wheeled Vehicle Motor Officer | 35th Division |
| Late 1943 - Early 1944 | 161st FA | Winter maneuvers | 35th Division |
| Early-Mid 1944 | 161st FA | Camp Butner | 35th Division |
| Mid 1944 | Battery B, 375th FA Bn | Asst. Executive Officer | 100th Division |
| Late 1944 | Infantry retraining | Infantry officer trainee | Fort Benning |
| Late 1944 - Early 1945 | Company M, 303rd Infantry | Platoon Officer | 97th Division |
| Mar-Jun 1945 | Company M, 303rd Infantry | Mortar Platoon Leader (combat) | 97th Division |
| Jun-Oct 1945 | Company M, 303rd Infantry | Platoon Officer (occupation) | 97th Division |
| May 1946 | — | Separated, Reserve Commission | Camp McCoy |
| May 1951 | Recalled | Reserve officer | Fort Sheridan |
| 1951-1952 | 4.2" Chemical Mortar Plt, 15th Infantry | Fire Direction Center Officer | 3rd Division |
| Sep 1952 | — | Final separation | Fort Sheridan |
