# Database Schema & Entity Relationship Diagram (ERD)
# VignusStream Web v2 (Supabase PostgreSQL Integration)

---

## 1. Arsitektur Hubungan Data (Mermaid ERD)

```mermaid
erDiagram
    users ||--o| profiles : "has profile"
    profiles ||--o{ camera_slots : "owns"
    camera_slots ||--o| signaling_sessions : "manages video signaling"
    camera_slots ||--o{ overlays : "displays visual assets"
    camera_slots ||--o{ scenes : "grouped into"

    profiles {
        uuid id PK
        string email
        string tier
        timestamp created_at
        timestamp updated_at
    }

    camera_slots {
        uuid id PK
        uuid user_id FK
        integer slot_number
        string name
        string pairing_token
        string status
        string active_protocol
        timestamp created_at
    }

    signaling_sessions {
        uuid id PK
        uuid camera_slot_id FK
        jsonb sdp_offer
        jsonb sdp_answer
        jsonb ice_candidates
        timestamp updated_at
    }

    overlays {
        uuid id PK
        uuid camera_slot_id FK
        string layer_type
        jsonb config
        boolean is_visible
        timestamp updated_at
    }
