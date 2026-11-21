# Feature Proposal 2: Real-Time Voice Consultant (WebRTC & Phone Audio)

**Author:** Principal Full-Stack Software Architect  
**Status:** Planned Feature Specification  

---

## 1. The Problem It Solves, and for Whom
High-value prospective clients and enterprise customers frequently call support hotlines or request real-time phone calls rather than typing into a web chat widget. Technical service companies lose significant revenue when hotlines go to voicemail outside office hours. This feature enables human-sounding, low-latency, real-time voice consultations over browser WebRTC and telephone telephony (Twilio Voice SIP).

## 2. Who Would Pay for It, and Why
High-ticket service businesses, legal-tech, and B2B SaaS vendors ($1,000+ ACV). They would pay $299–$499/month plus usage fees to ensure 24/7 immediate phone response for enterprise buyers, qualifying leads before competitors wake up.

## 3. User Flow, Step by Step
1. **Phone Inbound:** Customer dials the business's dedicated Twilio phone number or clicks "Start Voice Consultation" on the website.
2. **Audio Streaming:** WebRTC/Twilio streams audio chunks to an ultra-fast speech-to-text pipeline (Deepgram Nova-2 / Whisper).
3. **Turn Processing:**
   - Real-time text streams to the AI Tech Consultant agent loop.
   - PII is masked on the fly.
   - Safety shield confirms query is free of prompt injections and legal threats.
   - Hybrid search retrieves top-ranked Knowledge Brain chunks in < 250ms.
4. **Speech Synthesis:** Response tokens stream directly into a real-time text-to-speech engine (Cartesia / ElevenLabs Turbo) and stream back through the audio websocket.
5. **Call Summary & Transcript:** The full call transcript, audio recording, citations used, and calculated token/$ cost appear in `/chat`.

## 4. Screens and Tabs on Task 0 Map
- **Location:** In `/chat`, a new microphone icon in the header switches the session to **Voice Live Mode** with an interactive audio visualizer.
- **Settings:** In `/settings`, adds a sub-tab: **Voice & Telephony** (`/settings/voice`) allowing the owner to select TTS voice (e.g., British Executive, Warm Support), latency buffer, and Twilio phone credentials.

## 5. New Database Tables and Columns (Linked to DATABASE.md)
```sql
CREATE TABLE voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(255),
    caller_phone_masked VARCHAR(50),
    call_duration_seconds INT DEFAULT 0,
    voice_provider VARCHAR(50) DEFAULT 'elevenlabs',
    tts_cost_usd NUMERIC(10, 6) DEFAULT 0,
    recording_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. Connection to Existing Architecture
- **APIs:** Reuses `/api/brain/query` for sub-250ms chunk retrieval.
- **Models:** Utilizes `gemini-3.8-flash` or `claude-haiku-5.5` for sub-350ms first-token latency, critical for natural voice cadence (< 800ms total voice round-trip).
- **Telemetry:** Logs audio duration and model invocation in `model_call_logs`.
- **Safety:** Intercepts angry verbal sentiment and executes phone transfer to human hotline.

## 7. How to Measure Success ("Done When")
**Done when:** An inbound phone call or browser microphone conversation completes a 3-turn technical consultation with end-to-end voice latency under 900ms, accurate knowledge citation, and complete audio transcript logged with cost in `voice_sessions`.

## 8. Risks and Failure Modes
- **Audio Latency Spikes:** Network jitter causing pauses over 1.5 seconds. *Mitigation:* Audio chunk streaming via WebSockets with speculative knowledge pre-fetching on sentence pauses.
- **Interruption Handling:** Customer talking over the AI. *Mitigation:* Full-duplex audio stream with instant barge-in detection terminating TTS playback.

## 9. Estimated Hours to Build
**45 Engineering Hours** (WebRTC/Twilio audio plumbing: 15h, Streaming STT/TTS pipeline: 15h, Latency tuning: 8h, UI visualizer & tests: 7h).
