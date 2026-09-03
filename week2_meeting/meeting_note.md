## Week 2
  - Meeting reviewed project objectives via C2PA technical analysis and prioritized adopting industry standards for provenance.
  - **Strategic alignment on provenance standards**
    - Josh clarified that the team's objective is document auditability, with MSD and C2PA serving as implementation methods rather than the core project goal.
    - The team agreed to transition to C2PA if it supports the project's data requirements, avoiding redundant development of an internal standard.
    - Staple is confirmed as the distinct processing engine, independent of the metadata packaging method used.
  - **C2PA technical evaluation**
    - Leon noted that C2PA is a mature standard for file history and provenance, but current implementations have limitations regarding file type support, particularly for PDFs.
    - The team is testing whether C2PA allows embedding arbitrary, large-scale JSON data, such as OCR and reconciliation logs, which are currently handled by MSD.
    - Josh clarified that the AI Verify foundation is designed for LLM evaluations rather than document provenance, correcting the team's initial research suggestion.
  - **Next steps**
    - [ ]  [leon.D. Garse] Investigate C2PA Capabilities: Verify if C2PA supports custom JSON data inclusion and determine the maximum data size allowed. Additionally, assess the range of supported file types for this data encoding.
    - [ ]  [leon.D. Garse] Demonstrate C2PA Implementation: Conduct an experiment to demonstrate updating a file with custom data via C2PA and subsequently verify that the data can be correctly extracted.
    - [ ]  [Josh Kettlewell] Update Notion: Upload meeting notes and the session recording link to Notion.
    - [ ]  [The group] Research CTPA Specifications: Determine the maximum capacity for custom fields and identify all supported file types for CTPA.
    - [ ]  [The group] Schedule Meeting: Select a mutually agreeable day and time for the next session.
    - [ ]  [The group] Notify WhatsApp: Notify Josh via WhatsApp once the research results are uploaded to Notion.

