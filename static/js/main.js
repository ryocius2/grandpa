// ============================================================
// CONFIGURATION — Replace with your free Cesium Ion token
// Sign up at https://ion.cesium.com/ (free community tier)
// ============================================================
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5MTQ0MTkwOC0wZjc3LTRjMjUtOWJhMy01Y2Y3Y2Y5ZWM0MjUiLCJpZCI6NDMyNzg2LCJzdWIiOiJyeW9jaXVzIiwiaXNzIjoiaHR0cHM6Ly9pb24uY2VzaXVtLmNvbSIsImF1ZCI6Im15QXBwIiwiaWF0IjoxNzc5MDU1MTkwfQ.3665tlX3T5aDvnbGUZJZlQ1Ffn9qgNhOP3hc3OxSbSg';

// ============================================================
// STATE
// ============================================================
let viewer;
let events = [];
let worldEvents = [];
let storyConfig = {};
let imageManifest = {};
let currentMode = 'explore';
let currentEventIndex = -1;
let isPlaying = false;
let speedMultiplier = 1;
let storyTimeout = null;
let travelOverlayTimeout = null;
let eventEntities = [];
let worldEventEntities = [];
let pathEntity = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let isPresentationMode = false;
let wasPresentationMode = false;
let frontlinesVisible = false;
let frontlineData = [];
let frontlineEntities = [];

// Color constants — military standard
const COLORS = {
  friendly: Cesium.Color.fromCssColorString('#4a90d9'),
  hostile: Cesium.Color.fromCssColorString('#cc4444'),
  victory: Cesium.Color.fromCssColorString('#33bb55'),
  personal: Cesium.Color.fromCssColorString('#d4a84b'),
  path: Cesium.Color.fromCssColorString('#4a90d9').withAlpha(0.7),
  pathOutline: Cesium.Color.fromCssColorString('#000000')
};

const PHASE_LABELS = {
  training: 'Training — United States',
  eto: 'European Theater of Operations',
  pacific: 'Pacific / Occupation — Japan',
  korea: 'Korean War'
};

// ============================================================
// INITIALIZATION
// ============================================================
async function init() {
  const imageryProviders = [
    new Cesium.ProviderViewModel({
      name: 'Bing Aerial with Labels',
      tooltip: 'Satellite imagery with road/city labels',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/bingAerialLabels.png'),
      creationFunction: () => Cesium.IonImageryProvider.fromAssetId(3)
    }),
    new Cesium.ProviderViewModel({
      name: 'Bing Aerial',
      tooltip: 'Satellite imagery',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/bingAerial.png'),
      creationFunction: () => Cesium.IonImageryProvider.fromAssetId(2)
    }),
    new Cesium.ProviderViewModel({
      name: 'OpenStreetMap',
      tooltip: 'Street map with borders and cities',
      iconUrl: Cesium.buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
      creationFunction: () => new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
      })
    })
  ];

  viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    animation: false,
    timeline: false,
    baseLayerPicker: true,
    imageryProviderViewModels: imageryProviders,
    selectedImageryProviderViewModel: imageryProviders[0],
    terrainProviderViewModels: [],
    fullscreenButton: false,
    homeButton: false,
    infoBox: false,
    selectionIndicator: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    geocoder: false,
    creditContainer: document.createElement('div')
  });

  disableUserInteraction();

  const [eventsData, worldData, configData, manifestData, frontData] = await Promise.all([
    fetch('/static/data/events.json').then(r => r.json()),
    fetch('/static/data/world_events.json').then(r => r.json()),
    fetch('/static/data/story_config.json').then(r => r.json()),
    fetch('/static/data/image_manifest.json').then(r => r.json()),
    fetch('/static/data/frontlines.json').then(r => r.json())
  ]);

  events = eventsData;
  worldEvents = worldData;
  storyConfig = configData;
  imageManifest = manifestData;
  frontlineData = frontData;

  createEventEntities();
  createWorldEventEntities();
  createFrontlineEntities();
  createPath();
  buildTimeline();
  buildProgressDots();

  if (events.length > 0) {
    const firstEvt = events[0];
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        firstEvt.position[0], firstEvt.position[1],
        storyConfig.camera_altitude_at_stop || 50000
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-85),
        roll: 0
      }
    });
    currentEventIndex = 0;
    highlightTimelineEvent(0);
    updateProgress(0);
    updateEventLabels(0);
    toggleFrontlines(true);
  }
}

function disableUserInteraction() {
  const scene = viewer.scene;
  scene.screenSpaceCameraController.enableRotate = false;
  scene.screenSpaceCameraController.enableTranslate = false;
  scene.screenSpaceCameraController.enableZoom = false;
  scene.screenSpaceCameraController.enableTilt = false;
  scene.screenSpaceCameraController.enableLook = false;
}

// ============================================================
// ENTITY CREATION
// ============================================================
function createEventEntities() {
  const posCount = {};
  events.forEach((evt, i) => {
    const key = `${evt.position[0].toFixed(3)},${evt.position[1].toFixed(3)}`;
    if (!posCount[key]) posCount[key] = 0;
    const stackIndex = posCount[key]++;
    const labelOffset = -16 - (stackIndex * 18);

    const entity = viewer.entities.add({
      id: evt.id,
      position: Cesium.Cartesian3.fromDegrees(evt.position[0], evt.position[1]),
      point: {
        pixelSize: evt.bronze_star ? 14 : 10,
        color: COLORS.personal,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: 500000
      },
      label: {
        text: evt.title,
        font: 'bold 15px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, labelOffset),
        disableDepthTestDistance: 500000,
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.5),
        backgroundPadding: new Cesium.Cartesian2(6, 4),
        show: true
      }
    });
    eventEntities.push(entity);
  });

  viewer.screenSpaceEventHandler.setInputAction(function(click) {
    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked) && picked.id) {
      const idx = events.findIndex(e => e.id === picked.id.id);
      if (idx >= 0) {
        selectEvent(idx);
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function createWorldEventEntities() {
  worldEvents.forEach(evt => {
    let color;
    switch (evt.type) {
      case 'hostile': color = COLORS.hostile; break;
      case 'friendly': color = COLORS.friendly; break;
      case 'victory': color = COLORS.victory; break;
      default: color = Cesium.Color.GRAY;
    }

    const entity = viewer.entities.add({
      id: evt.id,
      position: Cesium.Cartesian3.fromDegrees(evt.position[0], evt.position[1]),
      point: {
        pixelSize: 12,
        color: color.withAlpha(0.8),
        outlineColor: color,
        outlineWidth: 2,
        disableDepthTestDistance: 500000
      },
      label: {
        text: evt.title,
        font: 'bold 13px sans-serif',
        fillColor: color,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        disableDepthTestDistance: 500000,
        showBackground: true,
        backgroundColor: new Cesium.Color(0, 0, 0, 0.4),
        backgroundPadding: new Cesium.Cartesian2(5, 3),
        show: false
      },
      show: true
    });
    worldEventEntities.push(entity);
  });
}

function createFrontlineEntities() {
  frontlineData.forEach(fl => {
    const color = fl.type === 'hostile'
      ? Cesium.Color.fromCssColorString('#cc4444').withAlpha(0.18)
      : Cesium.Color.fromCssColorString('#4a90d9').withAlpha(0.18);
    const outlineColor = fl.type === 'hostile'
      ? Cesium.Color.fromCssColorString('#cc4444').withAlpha(0.6)
      : Cesium.Color.fromCssColorString('#4a90d9').withAlpha(0.6);

    const positions = fl.polygon.flatMap(p => [p[0], p[1]]);

    const entity = viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
        material: color,
        outline: true,
        outlineColor: outlineColor,
        outlineWidth: 2,
        classificationType: Cesium.ClassificationType.BOTH
      },
      show: false
    });

    frontlineEntities.push({
      entity: entity,
      dateStart: new Date(fl.date_start),
      dateEnd: new Date(fl.date_end),
      type: fl.type
    });
  });
}

function createPath() {
  const positions = events.map(e =>
    Cesium.Cartesian3.fromDegrees(e.position[0], e.position[1])
  );

  pathEntity = viewer.entities.add({
    polyline: {
      positions: positions,
      width: 5,
      material: new Cesium.PolylineOutlineMaterialProperty({
        color: COLORS.path,
        outlineColor: COLORS.pathOutline,
        outlineWidth: 1
      }),
      clampToGround: true
    }
  });
}

// ============================================================
// CAMERA
// ============================================================
function flyToEvent(index, animate = true) {
  const evt = events[index];
  const altitude = storyConfig.camera_altitude_at_stop || 50000;
  const duration = animate ? 2.0 / speedMultiplier : 0;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      evt.position[0], evt.position[1], altitude
    ),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-85),
      roll: 0
    },
    duration: duration
  });
}

function flyBetweenEvents(fromIndex, toIndex, onPanStart, overlayCount, hasSpecialCard) {
  return new Promise(resolve => {
    const from = events[fromIndex];
    const to = events[toIndex];

    const dist = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromDegrees(from.position[0], from.position[1]),
      Cesium.Cartesian3.fromDegrees(to.position[0], to.position[1])
    );

    const travelAlt = Math.min(
      Math.max(dist * 0.5, 200000),
      storyConfig.camera_altitude_during_travel || 2000000
    );
    const stopAlt = storyConfig.camera_altitude_at_stop || 50000;

    const zoomOutDuration = 1.2 / speedMultiplier;
    let baseFlyDuration = dist > 5000000 ? 6.0 : dist > 2000000 ? 4.0 : 2.5;
    const overlayTime = (overlayCount || 0) * (storyConfig.travel_overlay_duration_seconds || 4);
    const specialTime = hasSpecialCard ? 10 : 0;
    baseFlyDuration = Math.max(baseFlyDuration, overlayTime + specialTime + 2);
    const flyDuration = baseFlyDuration / speedMultiplier;
    const stopPitch = Cesium.Math.toRadians(-85);

    // Phase 1: zoom up from current spot
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        from.position[0], from.position[1], travelAlt
      ),
      orientation: {
        heading: 0,
        pitch: stopPitch,
        roll: 0
      },
      duration: zoomOutDuration,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        if (onPanStart) onPanStart(flyDuration);
        // Phase 2: fly to destination and descend
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            to.position[0], to.position[1], stopAlt
          ),
          orientation: {
            heading: 0,
            pitch: stopPitch,
            roll: 0
          },
          duration: flyDuration,
          easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
          complete: resolve
        });
      }
    });
  });
}

// ============================================================
// TIMELINE
// ============================================================
function buildTimeline() {
  const container = document.getElementById('timelineEvents');
  container.innerHTML = '';
  let lastPhase = null;

  events.forEach((evt, i) => {
    if (evt.phase !== lastPhase) {
      lastPhase = evt.phase;
      const phaseDiv = document.createElement('div');
      phaseDiv.className = `timeline-phase phase-${evt.phase}`;
      phaseDiv.textContent = PHASE_LABELS[evt.phase] || evt.phase;
      container.appendChild(phaseDiv);
    }

    const div = document.createElement('div');
    div.className = 'timeline-event';
    div.dataset.index = i;
    div.onclick = () => selectEvent(i);

    let titleHtml = evt.title;
    if (evt.bronze_star) {
      titleHtml += ' <span class="bronze-star-icon">&#9733;</span>';
    }

    div.innerHTML = `
      <div class="timeline-event-title">${titleHtml}</div>
      <div class="timeline-event-date">${evt.date_display}</div>
    `;
    container.appendChild(div);
  });
}

function highlightTimelineEvent(index) {
  document.querySelectorAll('.timeline-event').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  const activeEl = document.querySelector('.timeline-event.active');
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ============================================================
// PROGRESS BAR
// ============================================================
function buildProgressDots() {
  const container = document.getElementById('progressDots');
  container.innerHTML = '';
  events.forEach((evt, i) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot';
    dot.style.left = `${(i / (events.length - 1)) * 100}%`;
    dot.onclick = () => {
      if (currentMode === 'story') {
        jumpToStoryEvent(i);
      }
    };
    container.appendChild(dot);
  });
}

function updateProgress(index) {
  const pct = events.length > 1 ? (index / (events.length - 1)) * 100 : 0;
  document.getElementById('progressFill').style.width = pct + '%';

  document.querySelectorAll('.progress-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
    dot.classList.toggle('completed', i < index);
  });
}

// ============================================================
// INFO PANEL
// ============================================================
function showInfoPanel(evt) {
  const panel = document.getElementById('infoPanel');
  panel.classList.remove('hidden');

  document.getElementById('infoTitle').textContent = evt.title;
  document.getElementById('infoDate').innerHTML = `<strong>Date:</strong> ${evt.date_display}`;
  document.getElementById('infoUnit').innerHTML = `<strong>Unit:</strong> ${evt.unit}`;
  document.getElementById('infoRole').innerHTML = `<strong>Role:</strong> ${evt.role}`;
  document.getElementById('infoDescription').textContent = evt.description;

  // Images
  const imgContainer = document.getElementById('infoImages');
  imgContainer.innerHTML = '';
  const manifest = imageManifest[evt.id];
  if (manifest && manifest.images) {
    manifest.images.forEach(img => {
      const wrapper = document.createElement('div');
      wrapper.className = 'info-image-container';
      if (img.src.endsWith('.pdf')) {
        wrapper.innerHTML = `
          <a href="${img.src}" target="_blank" style="color: #d4a84b; text-decoration: none;">
            &#128196; ${img.caption}
          </a>
        `;
      } else {
        const imgEl = document.createElement('img');
        imgEl.src = img.src;
        imgEl.alt = img.caption;
        imgEl.onerror = function() { this.style.display = 'none'; };
        imgEl.onclick = () => openLightbox(img.src, img.caption);
        wrapper.appendChild(imgEl);
        const cap = document.createElement('div');
        cap.className = 'info-image-caption';
        cap.textContent = img.caption;
        wrapper.appendChild(cap);
      }
      imgContainer.appendChild(wrapper);
    });
  }

  // Primary quote
  const quoteEl = document.getElementById('infoQuote');
  if (evt.quote) {
    quoteEl.classList.remove('hidden');
    document.getElementById('infoQuoteText').textContent = `"${evt.quote}"`;
    document.getElementById('infoQuoteAttribution').textContent = `— ${evt.quote_attribution}`;
  } else {
    quoteEl.classList.add('hidden');
  }

  // Secondary quote
  const quoteSecEl = document.getElementById('infoQuoteSecondary');
  if (evt.quote_secondary) {
    quoteSecEl.classList.remove('hidden');
    document.getElementById('infoQuoteSecondaryText').textContent = `"${evt.quote_secondary}"`;
    document.getElementById('infoQuoteSecondaryAttribution').textContent = `— ${evt.quote_secondary_attribution}`;
  } else {
    quoteSecEl.classList.add('hidden');
  }

  // Near-miss
  const nearMissEl = document.getElementById('infoNearMiss');
  if (evt.near_miss) {
    nearMissEl.classList.remove('hidden');
    document.getElementById('infoNearMissText').textContent = evt.near_miss;
  } else {
    nearMissEl.classList.add('hidden');
  }

  // Bronze Star
  const bsEl = document.getElementById('infoBronzeStar');
  bsEl.classList.toggle('hidden', !evt.bronze_star);

  // Sources
  const sourceList = document.getElementById('infoSourceList');
  sourceList.innerHTML = '';
  (evt.sources || []).forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    sourceList.appendChild(li);
  });

  // World context
  showWorldContext(evt);
}

function showWorldContext(evt) {
  const container = document.getElementById('infoWorldContext');
  const eventsDiv = document.getElementById('infoWorldEvents');
  eventsDiv.innerHTML = '';

  const evtDate = new Date(evt.date);
  const evtDateEnd = evt.date_end ? new Date(evt.date_end) : evtDate;

  const concurrent = worldEvents.filter(we => {
    const weDate = new Date(we.date);
    const weDateEnd = we.date_end ? new Date(we.date_end) : weDate;
    return weDate <= evtDateEnd && weDateEnd >= evtDate;
  });

  if (concurrent.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  concurrent.forEach(we => {
    const div = document.createElement('div');
    div.className = `world-event-item ${we.type}`;
    div.innerHTML = `
      <div class="world-event-title">${we.title}</div>
      <div class="world-event-date">${we.date_display}</div>
      <div class="world-event-desc">${we.description}</div>
    `;
    eventsDiv.appendChild(div);
  });
}

function closeInfoPanel() {
  document.getElementById('infoPanel').classList.add('hidden');
}

// ============================================================
// EVENT SELECTION
// ============================================================
function selectEvent(index) {
  currentEventIndex = index;
  const evt = events[index];

  highlightTimelineEvent(index);
  updateProgress(index);
  flyToEvent(index);
  showInfoPanel(evt);
  updateEventLabels(index);
  showNearbyWorldEvents(evt);
}

function updateEventLabels(activeIndex) {
  const activeEvt = events[activeIndex];
  const activeKey = `${activeEvt.position[0].toFixed(3)},${activeEvt.position[1].toFixed(3)}`;

  const shownPositions = {};
  eventEntities.forEach((entity, i) => {
    const evt = events[i];
    const key = `${evt.position[0].toFixed(3)},${evt.position[1].toFixed(3)}`;
    if (key === activeKey) {
      entity.label.show = (i === activeIndex);
    } else if (shownPositions[key]) {
      entity.label.show = false;
    } else {
      shownPositions[key] = true;
      entity.label.show = true;
    }
  });
}

function showNearbyWorldEvents(evt) {
  updateFrontlines(evt);
  if (!frontlinesVisible) return;
  const evtDate = new Date(evt.date);
  const evtDateEnd = evt.date_end ? new Date(evt.date_end) : evtDate;
  worldEventEntities.forEach((entity, i) => {
    const we = worldEvents[i];
    const weDate = new Date(we.date);
    const weDateEnd = we.date_end ? new Date(we.date_end) : weDate;
    const overlaps = weDate <= evtDateEnd && weDateEnd >= evtDate;
    entity.show = true;
    entity.label.show = overlaps;
  });
}

// ============================================================
// MODE SWITCHING
// ============================================================
function setMode(mode) {
  currentMode = mode;

  document.getElementById('btnExplore').classList.toggle('active', mode === 'explore');
  document.getElementById('btnStory').classList.toggle('active', mode === 'story');
  document.getElementById('storyControls').classList.toggle('hidden', mode !== 'story');

  if (mode === 'story') {
    closeInfoPanel();
    if (currentEventIndex < 0) currentEventIndex = 0;
  } else {
    stopStory();
    hideNarrationCard();
    hideTravelOverlay();
    hideDownfallCard();
  }
}

// ============================================================
// STORY MODE
// ============================================================
function storyTogglePlay() {
  if (isPlaying) {
    pauseStory();
  } else {
    startStory();
  }
}

function startStory() {
  isPlaying = true;
  document.getElementById('btnPlayPause').innerHTML = '&#9646;&#9646;';
  if (currentEventIndex < 0) currentEventIndex = 0;
  playCurrentEvent();
}

function pauseStory() {
  isPlaying = false;
  document.getElementById('btnPlayPause').innerHTML = '&#9654;';
  clearTimeout(storyTimeout);
  clearTimeout(travelOverlayTimeout);
}

function stopStory() {
  pauseStory();
  hideNarrationCard();
  hideTravelOverlay();
  hideDownfallCard();
}

function storyNext() {
  clearTimeout(storyTimeout);
  clearTimeout(travelOverlayTimeout);
  hideNarrationCard();
  hideTravelOverlay();
  hideDownfallCard();

  if (currentEventIndex < events.length - 1) {
    currentEventIndex++;
    if (isPlaying) {
      travelToEvent(currentEventIndex);
    } else {
      flyToEvent(currentEventIndex);
      showNarrationForEvent(currentEventIndex);
      highlightTimelineEvent(currentEventIndex);
      updateProgress(currentEventIndex);
      updateEventLabels(currentEventIndex);
    }
  }
}

function storyPrev() {
  clearTimeout(storyTimeout);
  clearTimeout(travelOverlayTimeout);
  hideNarrationCard();
  hideTravelOverlay();
  hideDownfallCard();

  if (currentEventIndex > 0) {
    currentEventIndex--;
    flyToEvent(currentEventIndex);
    showNarrationForEvent(currentEventIndex);
    highlightTimelineEvent(currentEventIndex);
    updateProgress(currentEventIndex);
    updateEventLabels(currentEventIndex);
  }
}

function jumpToStoryEvent(index) {
  clearTimeout(storyTimeout);
  clearTimeout(travelOverlayTimeout);
  hideNarrationCard();
  hideTravelOverlay();
  hideDownfallCard();

  currentEventIndex = index;
  flyToEvent(index);
  showNarrationForEvent(index);
  highlightTimelineEvent(index);
  updateProgress(index);
  updateEventLabels(index);

  if (isPlaying) {
    const dwellMs = getDwellTime(events[index]) * 1000 / speedMultiplier;
    storyTimeout = setTimeout(() => advanceStory(), dwellMs);
  }
}

async function playCurrentEvent() {
  if (!isPlaying || currentEventIndex >= events.length) {
    pauseStory();
    return;
  }

  const evt = events[currentEventIndex];
  highlightTimelineEvent(currentEventIndex);
  updateProgress(currentEventIndex);
  updateEventLabels(currentEventIndex);
  showNarrationForEvent(currentEventIndex);
  showNearbyWorldEvents(evt);

  let dwellMs = getDwellTime(evt) * 1000 / speedMultiplier;

  if (evt.operation_downfall) {
    storyTimeout = setTimeout(async () => {
      if (!isPlaying) return;
      hideNarrationCard();
      await showDownfallSequence();
      if (!isPlaying) return;
      advanceStory();
    }, dwellMs);
  } else {
    storyTimeout = setTimeout(() => advanceStory(), dwellMs);
  }
}

async function advanceStory() {
  if (!isPlaying) return;

  hideNarrationCard();

  if (currentEventIndex < events.length - 1) {
    const nextIndex = currentEventIndex + 1;
    await travelToEvent(nextIndex);
  } else {
    pauseStory();
    if (isRecording) {
      setTimeout(() => stopRecording(), 3000);
    }
  }
}

async function travelToEvent(toIndex) {
  const fromIndex = currentEventIndex;
  const toEvt = events[toIndex];

  updateEventLabels(toIndex);
  showTravelNarration(fromIndex, toIndex);

  const overlayCount = getTravelOverlayCount(fromIndex, toIndex);

  const flyPromise = flyBetweenEvents(fromIndex, toIndex, (panDuration) => {
    showTravelOverlaysDuringFlight(fromIndex, toIndex, panDuration);
  }, overlayCount, false);
  await flyPromise;

  currentEventIndex = toIndex;
  hideNarrationCard();
  hideTravelOverlay();
  hideDownfallCard();

  if (isPlaying) {
    playCurrentEvent();
  } else {
    showNarrationForEvent(toIndex);
    highlightTimelineEvent(toIndex);
    updateProgress(toIndex);
    updateEventLabels(toIndex);
  }
}

function getDwellTime(evt) {
  const override = storyConfig.events && storyConfig.events[evt.id];
  if (override && override.dwell_seconds) return override.dwell_seconds;
  return storyConfig.default_dwell_seconds || 8;
}

// ============================================================
// NARRATION CARDS
// ============================================================
function showNarrationForEvent(index) {
  const evt = events[index];
  const card = document.getElementById('narrationCard');

  const transportEl = document.getElementById('narrationTransport');
  if (evt.transport_label) {
    transportEl.textContent = evt.transport_label;
    transportEl.classList.remove('hidden');
  } else {
    transportEl.classList.add('hidden');
  }

  document.getElementById('narrationTitle').textContent = evt.title;
  document.getElementById('narrationDate').textContent = evt.date_display;
  document.getElementById('narrationUnit').textContent = `${evt.unit} — ${evt.role}`;

  if (evt.quote) {
    document.getElementById('narrationQuoteText').textContent = `"${evt.quote}"`;
    document.getElementById('narrationQuoteAttribution').textContent = `— ${evt.quote_attribution}`;
    document.getElementById('narrationQuote').style.display = '';
  } else {
    document.getElementById('narrationQuote').style.display = 'none';
  }

  const imgContainer = document.getElementById('narrationImages');
  imgContainer.innerHTML = '';
  const manifest = imageManifest[evt.id];
  if (manifest && manifest.images) {
    manifest.images.forEach(img => {
      if (!img.src.endsWith('.pdf')) {
        const imgEl = document.createElement('img');
        imgEl.src = img.src;
        imgEl.alt = img.caption;
        imgEl.onerror = function() { this.style.display = 'none'; };
        imgEl.onclick = () => openLightbox(img.src, img.caption);
        imgContainer.appendChild(imgEl);
      }
    });
  }

  // World events concurrent with this event
  const weContainer = document.getElementById('narrationWorldEvents');
  weContainer.innerHTML = '';
  const evtDate = new Date(evt.date);
  const evtDateEnd = evt.date_end ? new Date(evt.date_end) : evtDate;
  const nextEvtId = (index < events.length - 1) ? events[index + 1].id : null;
  const concurrent = worldEvents.filter(we => {
    if (we.travel_overlay && we.overlay_between &&
        we.overlay_between.includes(evt.id) && we.overlay_between.includes(nextEvtId)) {
      return false;
    }
    const weDate = new Date(we.date);
    const weDateEnd = we.date_end ? new Date(we.date_end) : weDate;
    return weDate <= evtDateEnd && weDateEnd >= evtDate;
  });
  concurrent.forEach(we => {
    const div = document.createElement('div');
    div.className = `narration-world-event ${we.type}`;
    div.innerHTML = `<span class="we-title">${we.title}</span> <span class="we-date">${we.date_display}</span>`;
    weContainer.appendChild(div);
  });

  card.classList.remove('hidden');
}

function showTravelNarration(fromIndex, toIndex) {
  const toEvt = events[toIndex];
  if (!toEvt.transport_label) return;

  const card = document.getElementById('narrationCard');
  document.getElementById('narrationTransport').textContent = toEvt.transport_label;
  document.getElementById('narrationTransport').classList.remove('hidden');
  document.getElementById('narrationTitle').textContent = `En route to ${toEvt.title.split('—')[0].trim()}`;
  document.getElementById('narrationDate').textContent = '';
  document.getElementById('narrationUnit').textContent = '';
  document.getElementById('narrationQuote').style.display = 'none';
  document.getElementById('narrationImages').innerHTML = '';
  card.classList.remove('hidden');
}

function hideNarrationCard() {
  document.getElementById('narrationCard').classList.add('hidden');
}

// ============================================================
// TRAVEL OVERLAYS (World events during travel)
// ============================================================
function getTravelOverlayCount(fromIndex, toIndex) {
  const fromId = events[fromIndex].id;
  const toId = events[toIndex].id;
  return worldEvents.filter(we =>
    we.travel_overlay && we.overlay_between &&
    we.overlay_between.includes(fromId) && we.overlay_between.includes(toId)
  ).length;
}

function showTravelOverlaysDuringFlight(fromIndex, toIndex, panDurationSec) {
  const fromId = events[fromIndex].id;
  const toId = events[toIndex].id;

  const overlays = worldEvents.filter(we =>
    we.travel_overlay &&
    we.overlay_between &&
    we.overlay_between.includes(fromId) &&
    we.overlay_between.includes(toId)
  );

  if (overlays.length === 0) return;

  const displayMs = (storyConfig.travel_overlay_duration_seconds || 4) * 1000 / speedMultiplier;
  const fadeMs = 600;
  const gapMs = 800 / speedMultiplier;
  const slotMs = displayMs + fadeMs + gapMs;

  overlays.forEach((overlay, i) => {
    setTimeout(() => showTravelOverlayCard(overlay, displayMs), i * slotMs);
  });
}

function showTravelOverlayCard(worldEvent, displayMs) {
  const el = document.getElementById('travelOverlay');
  document.getElementById('travelOverlayText').textContent = worldEvent.overlay_text;

  if (worldEvent.type === 'victory') {
    el.style.background = 'rgba(30,100,50,0.85)';
    el.style.borderColor = 'rgba(50,180,80,0.5)';
  } else {
    el.style.background = 'rgba(150,30,30,0.85)';
    el.style.borderColor = 'rgba(200,50,50,0.5)';
  }

  el.classList.remove('hidden');
  el.classList.remove('fade-out');

  travelOverlayTimeout = setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      el.classList.add('hidden');
      el.classList.remove('fade-out');
    }, 600);
  }, displayMs);
}

function hideTravelOverlay() {
  const el = document.getElementById('travelOverlay');
  el.classList.add('hidden');
  el.classList.remove('fade-out');
  clearTimeout(travelOverlayTimeout);
}

// ============================================================
// OPERATION DOWNFALL SPECIAL CARD
// ============================================================
function showDownfallSequence() {
  return new Promise(resolve => {
    const card = document.getElementById('downfallCard');
    card.classList.remove('hidden');
    const duration = 20000 / speedMultiplier;
    setTimeout(() => {
      card.classList.add('hidden');
      resolve();
    }, duration);
  });
}

function hideDownfallCard() {
  document.getElementById('downfallCard').classList.add('hidden');
}

// ============================================================
// SPEED CONTROL
// ============================================================
function setSpeed(speed) {
  speedMultiplier = speed;
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.textContent) === speed);
  });
}

// ============================================================
// FRONTLINES TOGGLE
// ============================================================
function toggleFrontlines(visible) {
  frontlinesVisible = visible;
  worldEventEntities.forEach((entity, i) => {
    entity.show = visible;
    entity.label.show = visible;
  });
  if (currentEventIndex >= 0) {
    updateFrontlines(events[currentEventIndex]);
  }
}

function updateFrontlines(evt) {
  if (!frontlinesVisible) {
    frontlineEntities.forEach(fl => fl.entity.show = false);
    return;
  }
  const evtDate = new Date(evt.date);
  const evtDateEnd = evt.date_end ? new Date(evt.date_end) : evtDate;
  frontlineEntities.forEach(fl => {
    fl.entity.show = fl.dateStart <= evtDateEnd && fl.dateEnd >= evtDate;
  });
}

// ============================================================
// PRESENTATION MODE
// ============================================================
function togglePresentation() {
  isPresentationMode = !isPresentationMode;
  document.body.classList.toggle('presentation', isPresentationMode);
  document.getElementById('btnPresentation').classList.toggle('active', isPresentationMode);
}

// ============================================================
// VIDEO EXPORT
// ============================================================
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser', frameRate: 30 },
      preferCurrentTab: true
    });
  } catch (e) {
    return;
  }

  recordedChunks = [];

  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 12000000
    });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: 12000000
    });
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harold_krusemark_service.webm';
    a.click();
    URL.revokeObjectURL(url);

    if (!wasPresentationMode) togglePresentation();
  };

  stream.getVideoTracks()[0].onended = () => stopRecording();

  mediaRecorder.start(1000);
  isRecording = true;
  wasPresentationMode = isPresentationMode;
  if (!isPresentationMode) togglePresentation();
  document.getElementById('btnRecord').classList.add('recording');
  document.getElementById('recordingIndicator').classList.remove('hidden');

  setMode('story');
  currentEventIndex = 0;
  flyToEvent(0, false);
  highlightTimelineEvent(0);
  updateProgress(0);
  updateEventLabels(0);

  setTimeout(() => startStory(), 1000);
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  document.getElementById('btnRecord').classList.remove('recording');
  document.getElementById('recordingIndicator').classList.add('hidden');
}

// ============================================================
// LIGHTBOX
// ============================================================
function openLightbox(src, caption) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxCaption').textContent = caption || '';
  document.getElementById('lightbox').classList.remove('hidden');
}

function closeLightbox(e) {
  if (e && e.target.id === 'lightboxImg') return;
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightboxImg').src = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

// ============================================================
// MOBILE TIMELINE TOGGLE
// ============================================================
document.getElementById('mobileTimelineToggle').addEventListener('click', () => {
  document.getElementById('timeline').classList.toggle('mobile-open');
  document.getElementById('mobileOverlay').classList.toggle('active');
});

document.getElementById('mobileOverlay').addEventListener('click', () => {
  document.getElementById('timeline').classList.remove('mobile-open');
  document.getElementById('mobileOverlay').classList.remove('active');
});

// ============================================================
// BOOT
// ============================================================
init();
