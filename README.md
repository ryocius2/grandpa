# Harold "Boyce" Krusemark — Military Service 1942–1952

An interactive 3D globe tracing Harold Krusemark's service across World War II and the Korean War. Built as a family memorial.

## What It Shows

- **27 stops** across the US, Europe, Japan, and Korea
- **Story mode** — animated playback with narration cards, travel overlays, and world event context
- **Explore mode** — click any stop to read about it
- **Frontline overlays** — Allied/Axis and UN/Communist territory shading by date
- **World events** — D-Day, Battle of the Bulge, atomic bombs, V-E Day, and more shown in context

## Tech

- Python / Flask backend
- [CesiumJS](https://cesium.com/) 3D globe
- Vanilla JS, no frontend framework

## Running Locally

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## Deployment

Deployed on Raspberry Pi via Cloudflare Tunnel at [boyce.marandagetsyoshed.com](https://boyce.marandagetsyoshed.com).
See `deploy/` for systemd service files and `todo.txt` for setup steps.

## Note on Images

Personal family photos are not included in this repository (`pictures/` is gitignored).
