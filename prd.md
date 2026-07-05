# Product Requirements Document (PRD)

# Vignus IRL Studio v2

### Freemium Multi-Protocol Mobile Camera System

---

# 1. Project Overview

Vignus IRL Studio adalah aplikasi desktop Windows berbasis Electron yang berfungsi sebagai pusat penerimaan, monitoring, routing, dan output kamera dari smartphone melalui jaringan internet.

Aplikasi mendukung tiga metode input kamera:

1. Web Camera (Browser HP → WebRTC)
2. RTMP Camera (IRL Pro / Larix / Prism Live)
3. SRT Camera (IRL Pro / Larix)

Tujuan utama:

* Mengubah smartphone menjadi kamera wireless profesional.
* Mendukung penggunaan melalui jaringan seluler.
* Tidak membutuhkan VPS pribadi.
* Tidak membutuhkan domain pribadi.
* Tetap memiliki latensi rendah.
* Mendukung OBS Browser Source.
* Mendukung multi camera hingga 5 kamera.

---

# 2. Technology Stack

## Desktop Application

* Electron
* Node.js
* HTML
* CSS
* Vanilla JavaScript

## Streaming Engine

* MediaMTX

## Authentication

* Supabase Auth
* Supabase PostgreSQL

## Network Layer

* Tailscale Mesh Network

## Supported Protocols

### Input

* WebRTC
* RTMP
* SRT

### Output

* WebRTC
* OBS Browser Source

---

# 3. Core Product Goals

## Free Tier

* 1 Camera
* Web Camera
* RTMP Input
* SRT Input
* OBS Output
* Basic Monitoring

## Pro Tier

* Up to 5 Cameras
* Overlay System
* Scene Management
* Advanced Statistics
* Multi Camera Monitoring
* Priority Features

---

# 4. System Architecture

## High Level Architecture

Mobile Device

↓

Internet

↓

Tailscale Mesh

↓

Vignus IRL Studio

↓

MediaMTX

↓

OBS / Browser Source

---

Supported Input Sources:

### Method A

Browser Camera

HP Browser

↓

WebRTC

↓

Vignus Studio

### Method B

IRL Pro RTMP

IRL Pro

↓

RTMP

↓

MediaMTX

↓

Vignus Studio

### Method C

IRL Pro SRT

IRL Pro

↓

SRT

↓

MediaMTX

↓

Vignus Studio

---

# 5. Camera Pairing System

Each camera slot generates:

* Camera ID
* QR Code
* Pairing URL
* RTMP Endpoint
* SRT Endpoint

Example:

Camera 1

Web URL:

http://100.x.x.x/mobile/cam1

RTMP:

rtmp://100.x.x.x/live/cam1

SRT:

srt://100.x.x.x:8890/cam1

---

# 6. Tailscale Integration

## Purpose

Allow smartphone and desktop communication without:

* VPS
* Public IP
* Port Forwarding
* Domain

## Requirements

Electron must:

* Detect Tailscale installation
* Detect Tailscale IP
* Display Tailscale status
* Warn if disconnected

Node IPC:

getTailscaleIP()

returns:

100.x.x.x

---

# 7. Authentication System

Supabase Auth

Supported:

* Email Login
* Email Register
* Session Persistence
* Password Reset

After login:

Fetch user profile

Table:

profiles

Fields:

* id
* email
* tier
* created_at

Tier Values:

* free
* pro

---

# 8. Camera Slot Management

## Free

Maximum:

1 Camera

UI:

* Single Slot
* Upgrade Banner

---

## Pro

Maximum:

5 Cameras

UI:

Dynamic Grid

Supported Layouts:

* 1x1
* 2x2
* 3x2
* Custom

---

# 9. Web Camera Mode

## Purpose

Use smartphone browser as camera source.

Workflow:

Generate QR

↓

User scans QR

↓

Open mobile page

↓

Browser requests:

* Camera
* Microphone

↓

Start WebRTC stream

↓

Display in Studio

Requirements:

* Front Camera
* Rear Camera
* Torch Toggle
* Audio Toggle
* Resolution Selection

Latency Target:

100-300 ms

---

# 10. RTMP Input Mode

## Supported Apps

* IRL Pro
* Larix Broadcaster
* Prism Live

Example:

Server:

rtmp://100.x.x.x/live

Stream Key:

cam1

MediaMTX receives stream.

Studio displays stream.

Latency Target:

500-1500 ms

---

# 11. SRT Input Mode

## Supported Apps

* IRL Pro
* Larix Broadcaster

Example:

Host:

100.x.x.x

Port:

8890

Stream ID:

cam1

MediaMTX receives stream.

Studio displays stream.

Latency Target:

200-800 ms

---

# 12. MediaMTX Integration

MediaMTX starts automatically.

Electron launches:

mediamtx.exe

on startup.

Electron kills:

mediamtx.exe

on shutdown.

Supported Services:

* SRT Listener
* RTMP Listener
* WebRTC Gateway

---

# 13. OBS Integration

## OBS Browser Source

Each camera generates URL:

http://localhost:3000/obs-widget.html?cam=1

Features:

* Transparent Background
* Auto Reconnect
* Hardware Accelerated
* Secure Camera Validation

Copy Button:

Copy OBS URL

---

# 14. Connection Monitoring

Per Camera:

Display:

* Protocol Type
* Resolution
* FPS
* Bitrate
* Audio Status
* Uptime
* Packet Loss
* Latency

Source:

RTCPeerConnection.getStats()

MediaMTX Metrics

---

# 15. Auto Reconnect System

For:

* WebRTC
* RTMP
* SRT

If stream disconnects:

Retry every:

2 seconds

Display:

RECONNECTING

until stream returns.

---

# 16. Overlay System (Pro)

Features:

* Text Overlay
* Image Overlay
* PNG Overlay
* Watermark
* Clock
* Custom HTML Overlay

---

# 17. Security

Requirements:

* Session Validation
* Secure Camera Pairing Tokens
* Expiring QR Links
* OBS URL Validation
* Camera Ownership Validation

QR Links expire after:

10 minutes

---

# 18. Performance Requirements

RAM Usage:

Target:

<300 MB

CPU:

Hardware Accelerated

Electron Flags:

enable-hardware-overlays

disable-background-timer-throttling

---

# 19. User Flow

User Login

↓

Open Dashboard

↓

Add Camera

↓

Generate:

* QR
* RTMP Endpoint
* SRT Endpoint

↓

Choose Method:

Web

or

RTMP

or

SRT

↓

Stream Received

↓

Preview Appears

↓

OBS Output Available

---

# 20. Future Roadmap

Phase 1

* Authentication
* MediaMTX
* Single Camera

Phase 2

* RTMP Input
* SRT Input
* OBS Output

Phase 3

* Web Camera
* QR Pairing
* Tailscale Integration

Phase 4

* Multi Camera
* Overlay System

Phase 5

* Scene Management
* Recording
* Replay Buffer

Phase 6

* NDI Output
* Virtual Camera Output

Phase 7

* AI Auto Framing
* AI Noise Reduction
* AI Audio Processing
