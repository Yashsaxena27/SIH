# POTHOLE WALA — POST-SIH ROADMAP & PRODUCTION EVOLUTION
## Engineering Trajectory Beyond SIH 2026 Grand Finale

============================================================
STAGE: Post-Competition Engineering & National Scalability Plan
TIMELINE: Q4 2026 – Q4 2027
============================================================

---

## Phase 13: Hardware Edge Sensing Appliance (Q4 2026)
- **Objective**: Transition from software demonstration to ruggedized, IP67-rated bus-mountable edge hardware.
- **Hardware Stack**:
  - NVIDIA Jetson Orin Nano (40 TOPS) industrial board.
  - Sony IMX390 automotive-grade image sensor with HDR (120dB dynamic range to eliminate sun glare in Barapullah-style tunnels/overpasses).
  - High-precision Quectel LC29H dual-band RTK GNSS module (<0.5m horizontal accuracy).
- **Firmware Capabilities**:
  - H.265 / AV1 hardware video encoding.
  - Automatic opportunistic Wi-Fi depot sync: bulk upload of raw video clips upon returning to DTC bus depots, transmitting only compact JSON telemetry over 4G/5G cellular while en route.

---

## Phase 14: Multi-Class Road Damage Classification (Q1 2027)
- **Objective**: Extend model capabilities beyond potholes to comprehensive pavement distress inventory.
- **Dataset Integration**:
  - Fine-tune on India-specific RDD2022 dataset (Crowd-sensing Road Damage Detection).
- **Target Distress Classes**:
  - Longitudinal Cracking (D00).
  - Transverse Cracking (D10).
  - Alligator / Fatigue Cracking (D20).
  - Ravelling and Manhole Cover subsidence (D40).
- **Structural Pavement Rating**:
  - Integrate laser distance time-of-flight sensors to measure rutting depth and true volumetric pavement loss.

---

## Phase 15: National Municipal ERP & Citizen Portal Integrations (Q2 2027)
- **Objective**: Seamless interoperability with Indian government digital public infrastructure.
- **Direct Connectors**:
  - **NIC (National Informatics Centre)**: Direct bi-directional API connector for state PWD and NHAI maintenance systems.
  - **MoHUA CPGRAMS**: Automated sync of public road grievances with verified inspection telemetry.
  - **112 / Emergency Response**: Real-time hazard alerting for emergency services (ambulances, fire engines) via SafeRoute API.

---

## Phase 16: Pan-India Cloud-Native Deployment & Multi-Tenancy (Q3 2027)
- **Objective**: Scalable multi-tenant SaaS architecture for deployment across Tier-1 and Tier-2 Indian municipalities.
- **Infrastructure Architecture**:
  - Kubernetes (K8s) Helm deployment charts with regional PostGIS spatial partitioning.
  - Tenancy isolation: State PWDs (e.g. Delhi PWD, UP PWD, Maharashtra PWD) and Municipal Corporations (MCD, BMC, BBMP) operate under dedicated cryptographic namespaces.
  - Federated GIS layers allowing cross-boundary corridor monitoring on National Highways.
