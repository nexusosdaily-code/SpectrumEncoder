# SpectrumEncoder

  > **CE→SE: Character Encoding to Spectral Encoding — free AGPL-3.0 infrastructure for the civilization.**
  > Maps every character to a unique position in the electromagnetic spectrum. Silicon bridge until photonics arrives ~2032.

  [![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
  [![Part of NexusOS](https://img.shields.io/badge/Part%20of-NexusOS-blueviolet)](https://github.com/nexusosdaily-code/NexusOS)

  ---

  ## What is SpectrumEncoder?

  SpectrumEncoder is the encoding layer of NexusOS. It implements WASCII v2.0 — the Wave ASCII standard — which assigns every character (ordinal 0–201) a unique physical address in three dimensions:

  ```
  λ   (wavelength nm)   — which colour of light carries this character
  ℓ   (OAM mode)        — which orbital angular momentum ring it occupies
  pol (polarisation)    — H (horizontal) or V (vertical)
  ```

  Two characters on different Ψ channels **cannot interfere**. This is the physical basis for NexusOS addressing — not cryptography, not software namespacing. Physics.

  ---

  ## WASCII v2.0 — 202 Characters, 25,600 Channels

  The full WASCII table is stored in PostgreSQL and served live via `GET /api/wascii`. Every row is a spectral fingerprint:

  | Ordinal | Character | λ (nm) | OAM ℓ | Pol | GPIO PWM |
  |---------|-----------|--------|-------|-----|----------|
  | 065     | A         | 656.3  | 15    | H   | 128      |
  | 078     | N         | 700.0  | 28    | V   | 204      |
  | 088     | X         | 737.6  | 38    | H   | 171      |
  | 084     | T         | 723.1  | 34    | H   | 163      |
  | 048     | 0         | 607.0  | 0     | H   | 89       |

  **Channel space:**
  ```
  256 WDM bands  ×  50 OAM modes  ×  2 polarisations  =  25,600 orthogonal channels
  ```

  ---

  ## CE→SE Encoding Pipeline

  ```
  Input string  →  CE (Character Encoding)  →  SE (Spectral Encoding)  →  Physical wave frame
  ```

  **Step 1 — CE lookup:** Each character resolves to `(λ, ℓ, pol, amplitude, phase)` from the WASCII database.

  **Step 2 — SE frame construction:** The CE parameters build a physical wave frame:
  ```
  I  = amplitude × cos(2πft)              (intensity)
  Q  = amplitude × sin(2πft + phase)      (quadrature)
  S1 = I² - Q²                            (Stokes linear)
  S2 = 2IQ·cos(δ)                         (Stokes cross)
  S3 = 2IQ·sin(δ)                         (Stokes circular)
  ```

  **Step 3 — Parallel transmission:** Because every character maps to an orthogonal channel, all characters of a message can be transmitted **simultaneously**. No serialisation bottleneck.

  ---

  ## Build Cost Breakdown: Proof on Commodity Hardware

  Three tiers prove that wave channel addressing, simultaneous encoding, and database lookup are real — not simulated.

  ### Tier 1 — Proof of Concept (~$250)

  Goal: Demonstrate wave channel addressing on the bench with visible light LEDs and a Raspberry Pi.

  | Component | Purpose | Cost |
  |-----------|---------|------|
  | Raspberry Pi 4B (4 GB) | GPIO PWM controller + database host | $55 |
  | 660 nm LED + driver | WDM band A (red) | $8 |
  | 700 nm LED + driver | WDM band B (deep red) | $10 |
  | 740 nm LED + driver | WDM band C (near-infrared) | $12 |
  | Polarisation sheet kit (H+V) | Polarisation state switching | $15 |
  | 3-ring OAM aperture set | OAM mode ℓ = 0, 1, 2 | $20 |
  | Photodetector BPW34 | Signal readback / calibration | $5 |
  | Breadboard + jumpers + PSU | Assembly | $30 |
  | MicroSD 32 GB | OS + NexusOS node | $15 |
  | Passives (resistors, caps) | Support components | $15 |
  | **Total** | | **~$185** |

  **What this proves:** Typing a character into the Calibration Verifier tab queries the PostgreSQL WASCII table, returns the expected λ ± 2 nm, and the corresponding GPIO pin drives the matching LED. Channel addressing is database-backed and hardware-verified.

  ---

  ### Tier 2 — Simultaneous Encoder (~$900)

  Goal: Demonstrate that 8 characters can be encoded and transmitted on 8 parallel channels in the same clock cycle.

  | Additional Component | Purpose | Cost |
  |---------------------|---------|------|
  | VCSEL diode array (8-ch) | 8 independent wavelength emitters | $220 |
  | Waveguide coupler | Channel combination into single fibre | $90 |
  | DAC board (16-bit, 8-ch) | Precision amplitude/phase control | $80 |
  | Photodetector array (8-ch) | Per-channel readback | $60 |
  | Fibre patch cables + mounts | Optical assembly | $40 |
  | **Additional cost** | | **~$490** |
  | **Tier 2 total** | | **~$675** |

  **What this proves:** The Character Trace tab shows the SE frame for each character independently. On Tier 2 hardware, each of those frames fires on a separate VCSEL channel simultaneously. The photodetector array confirms all 8 channels active in the same 1 ms window.

  ---

  ### Tier 3 — Full Node (~$2,500)

  Goal: Demonstrate database-backed channel lookup at <1 ms latency with spectrometer verification.

  | Additional Component | Purpose | Cost |
  |---------------------|---------|------|
  | Ocean Insight STS-VIS spectrometer | Ground-truth λ measurement ±0.5 nm | $800 |
  | Spatial Light Modulator (SLM) | Programmable OAM mode generation | $400 |
  | Polarisation beam splitter cube | Clean H/V separation | $120 |
  | Grating coupler pair | WDM channel demux/mux | $180 |
  | Lock-in amplifier (SR830 or equiv.) | Phase-locked readback at noise floor | $350 |
  | **Additional cost** | | **~$1,850** |
  | **Tier 3 total** | | **~$2,525** |

  **What this proves:** The spectrometer measures the actual emitted λ and compares it to the PostgreSQL WASCII value in real time. If `|λ_measured - λ_database| < 2 nm`, the database is a faithful physical map. This closes the loop: software addressing = hardware physics.

  ---

  ## Running Locally

  ```bash
  # The encoder is part of NexusOS — clone the main repo
  git clone https://github.com/nexusosdaily-code/NexusOS.git
  cd NexusOS
  npm install
  npm run dev

  # WASCII table endpoint (202 rows)
  curl http://localhost:5000/api/wascii

  # CE→SE encode a character (e.g. "A")
  curl -X POST http://localhost:5000/api/encode \
    -H "Content-Type: application/json" \
    -d '{"text": "A"}'
  ```

  The Python spectral API (port 5001) starts automatically with the Node.js server.

  ---

  ## Pi Bridge Script

  The Hardware Lab page (`/hardware-lab → Pi Script Generator`) generates a ready-to-run `hardware_lab_pi.py` tailored to your LED configuration. Download it, copy it to your Pi, and run:

  ```bash
  python3 hardware_lab_pi.py
  ```

  It reads from the WASCII table, converts ordinals to GPIO PWM values, and drives your LED array in real time as you type in the NexusOS UI.

  ---

  ## Genesis Channel

  ```
  Ψ(228, 45, H)  ·  λ ≈ 737.6 nm  ·  Near-infrared  ·  GUEST band
  ```

  The Genesis block of NexusOS was encoded at this channel. Every address in the system traces back to a physical position in the electromagnetic spectrum.

  ---

  ## License

  AGPL-3.0 — CE→SE encoding is free infrastructure for the civilization.  
  Fork it. Build it. Run a node. The protocol belongs to physics.
  