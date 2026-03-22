# CamViewerPlus Client
An ElectronJS client optimized for CamViewerPlus with WebRTC / RTSP live-streaming support via [MediaMTX](https://github.com/bluenviron/mediamtx).

## Features
- WebRTC (WHEP) live-streaming — smooth, low-latency video via MediaMTX
- H.264 / HEVC hardware-accelerated video decoding
- Configurable CamViewerPlus server URL (HTTP **and** HTTPS)
- Optional MediaMTX server URL for direct WHEP stream consumption
- Auto-refresh on a configurable schedule (cron-based)
- Default grid override per client device
- Persistent window state across restarts

## Build instructions
1. Clone the git repo
2. Run `npm i` to install the dependencies
3. Run `npm run release` to build the installer
4. Run the installer located in the `dist` folder to install the app

## Configuration
On first launch, set the CamViewerPlus server URL via **Configuration → Set Instance URL**.

If you are using a [MediaMTX](https://github.com/bluenviron/mediamtx) relay for WebRTC / RTSP streams, set its address via **Configuration → Set MediaMTX Server URL** (e.g. `http://192.168.1.10:8889`).  The server-side CamViewerPlus UI will automatically use this URL to construct WHEP endpoints for each camera stream.

## Development
```sh
npm start        # start in development mode (hot-reload)
npm run release  # build production installer
```
