Aug 28, 2026

## **NUS audibility project**

Invited [Wang Guowei](mailto:e1539332@u.nus.edu) [Josh Kettlewell](mailto:josh@staple.io) [Ding Wei](mailto:e1554458@u.nus.edu) [Zhuchao Li](mailto:zhuchao.li@staple.io) [e1553177@u.nus.edu](mailto:e1553177@u.nus.edu) [ulf.bissbort@gmail.com](mailto:ulf.bissbort@gmail.com)

Attachments [NUS audibility project](https://calendar.google.com/calendar/event?eid=NzIwdHNmdDcybm50MXRyczZwZmN0NW91ZnUgam9zaEBzdGFwbGUuaW8)

Meeting records [Transcript](https://docs.google.com/document/d/1C8QESCm3DniF_WLV1TSkBDF9A0MAcOK0eFLmeO4iceA/edit?usp=drive_web&tab=t.eblgx3c95s6u) [Recording](https://drive.google.com/file/d/10WTntnsU_JpWF1DvBkdbWujQ03U_N-ro/view?usp=drive_web) 

### **Summary**

The session compared provenance frameworks and established a strategic focus on visual communication for user adoption.

**C2PA Technical Evaluation**  
Evaluation of the Coalition for Content Provenance and Authenticity revealed capabilities for embedding custom data alongside limitations regarding proprietary PDF file types.

**MSD Provenance Advantages**  
Expansion of Media Signature Data to accommodate automated agents enhances market applicability, while its unique capability to track provenance across files remains its primary architectural differentiator.

**Strategic Product Positioning**  
The team decided to prioritize visual tooling for non-technical users to articulate specific problem-solving capabilities rather than relying on abstract technical explanations.

### **Decisions**

## Needs Further Discussion

* **Strategic relationship of MSD and C2PA** The strategic positioning of MSD in relation to C2PA (competing standard vs. parallel track) remains undecided pending further technical investigation into their interoperability and specific use cases.

* **Defining MSD core value proposition** The core customer problem and value proposition for MSD adoption require further definition to establish a clear and effective go-to-market strategy.

We've **updated the Decisions section** using your feedback.

Let us know what you think: [Helpful](https://google.qualtrics.com/jfe/form/SV_5bXzKQfylMIhSXc?isHelpful=True&entryPoint=decisions&confid=BKV5nE6tzO7gJsZU7hzMDxIQOBEBMgUIigIgABgECA&isGoogler=False) or [Not Helpful](https://google.qualtrics.com/jfe/form/SV_5bXzKQfylMIhSXc?isHelpful=False&entryPoint=decisions&confid=BKV5nE6tzO7gJsZU7hzMDxIQOBEBMgUIigIgABgECA&isGoogler=False)

### **Next steps**

- [ ] \[Josh Kettlewell\] Organize Next Call: Schedule and communicate a one-hour meeting for the following week.

- [ ] \[Josh Kettlewell\] Share MSD Resources: Send relevant videos demonstrating project use cases to the team.

- [ ] \[Josh Kettlewell\] Distribute Meeting Notes: Publish meeting summary to the WhatsApp group and Notion page.

- [ ] \[leon.D. Garse\] Verify C2PA Key: Determine if public keys are accessible within C2PA metadata during signature verification.

- [ ] \[The group\] Define Project Pitch: Refine the value proposition and core customer problems to create a coherent vision.

- [ ] \[The group\] Research MSD Interlinkability: Investigate file interlinkability features to differentiate this scheme from C2PA.

### **Details**

* **Introductions and Meeting Objectives**: Josh Kettlewell opened the meeting by introducing participants, noting Zhuchao Li's role in technical pre-sales at Staple in Shanghai, and welcoming full-time NUS students leon.D. Garse and Lamphare who are collaborating with Staple on the auditability of AI ([00:00:17](?tab=t.eblgx3c95s6u#heading=h.gxaj3141pj60)). Josh Kettlewell outlined the meeting's agenda, which focused on reviewing research regarding C2PA, examining features of MSD, and discussing the comparative pros and cons of both frameworks ([00:01:33](?tab=t.eblgx3c95s6u#heading=h.kajxtf2zo3gj)).

* **C2PA Technical Testing Results and File Limitations**: leon.D. Garse presented test findings indicating that C2PA supports embedding custom JSON with no data size limitations, though it requires data serialization where number strings (such as bounding boxes) become invalid. leon.D. Garse noted that C2PA currently supports media file types like images, audio, and video, while PDF writing (blocked by format ownership) and Word documents are unsupported ([00:02:48](?tab=t.eblgx3c95s6u#heading=h.fkmzsb4qtg61)). Josh Kettlewell and leon.D. Garse discussed how Adobe's ownership of the PDF format appears to be the reason for blocking PDF writing support within the C2PA tool ([00:06:43](?tab=t.eblgx3c95s6u#heading=h.cypaihlw19g1)).

* **C2PA Cross-Platform Integration and Architectural Differences**: leon.D. Garse demonstrated signature extraction using Gemini-generated images and highlighted that major platforms like OpenAI, Anthropic, YouTube, and Instagram utilize C2PA. Ulf Bissbort distinguished C2PA as a tool focused purely on embedding information directly into files, which operates orthogonally to MSD's approach of external database tracking, signing, and metadata management ([00:06:43](?tab=t.eblgx3c95s6u#heading=h.cypaihlw19g1)) ([00:10:38](?tab=t.eblgx3c95s6u#heading=h.kbxc32nr6qvd)).

* **Visa Trusted Agent Protocol and AI Agent Integration**: Lamphare presented research on Visa's Trusted Agent Protocol (TAP), which focuses on verifying whether automated AI agents can be trusted to execute financial transactions and guide behaviors on behalf of clients. Zhuchao Li and Lamphare discussed how expanding MSD scenarios to accommodate AI agents rather than solely human users broadens the potential use cases and market applicability ([00:15:08](?tab=t.eblgx3c95s6u#heading=h.y7vt53ohr47t)) ([00:18:47](?tab=t.eblgx3c95s6u#heading=h.loax05hyuj10)).

* **Enterprise Adoption and Trust Verification Challenges**: Ulf Bissbort raised concerns regarding enterprise adoption, questioning how workers would easily look up public keys to verify if a signature (such as Google LLC in C2PA) is genuinely trusted within corporate compliance rules without reducing workplace productivity ([00:25:09](?tab=t.eblgx3c95s6u#heading=h.i29sqs94lhh1)). Ulf Bissbort argued that requiring employees to manually run Python tools to inspect file metadata introduces too much friction, necessitating automated tooling that operates under the hood ([00:27:23](?tab=t.eblgx3c95s6u#heading=h.y421zyabregb)).

* **MSD Provenance Tracking and Cross-File Dependencies**: Ulf Bissbort explained that a core advantage of MSD is its capability to track data dependencies and provenance across files—such as connecting root delivery receipts to derived quarterly financial reports—without requiring companies to expose all internal logs ([00:30:19](?tab=t.eblgx3c95s6u#heading=h.w0yurfdkrriq)) ([00:33:33](?tab=t.eblgx3c95s6u#heading=h.69q3cbsmhisk)). Josh Kettlewell summarized this advantage, confirming that while logs provide initial auditability, MSD allows external entities like banks or auditors to verify actual source files rather than relying solely on signed log payloads ([00:32:29](?tab=t.eblgx3c95s6u#heading=h.asotz4ajnlvi)).

* **Strategic Positioning of MSD versus C2PA**: Josh Kettlewell and Ulf Bissbort debated whether C2PA represents a competitive threat to MSD or if they operate in parallel domains, with Josh Kettlewell suggesting potential grassroots positioning by highlighting C2PA's closed-source, Adobe-controlled nature ([00:34:33](?tab=t.eblgx3c95s6u#heading=h.fiuqhjb10llm)). leon.D. Garse explained that C2PA provides verification websites and logs to track history, while Josh Kettlewell and leon.D. Garse emphasized that MSD's distinct cross-file interlinkability remains a key differentiator that needs clear articulation ([00:38:03](?tab=t.eblgx3c95s6u#heading=h.ra7dt2deagfw)).

* **Next Steps and Product Vision Requirements**: Ulf Bissbort requested that the team develop a clear, coherent customer pitch outlining the specific problems MSD solves, noting that non-technical users will require visual tooling rather than abstract technical explanations ([00:42:26](?tab=t.eblgx3c95s6u#heading=h.fvxvu15w11e)). Lamphare and leon.D. Garse noted that the team will collaborate more closely post-validation to deliver unified group outputs ([00:43:22](?tab=t.eblgx3c95s6u#heading=h.x1vynuyn5kd6)). Josh Kettlewell agreed to share explanatory videos on MSD use cases and organize a follow-up meeting for the following week ([00:42:26](?tab=t.eblgx3c95s6u#heading=h.fvxvu15w11e)) ([00:44:37](?tab=t.eblgx3c95s6u#heading=h.ogeodhdvpzxf)).

*You should review Gemini's notes to make sure they're accurate. [Get tips and learn how Gemini takes notes](https://support.google.com/meet/answer/14754931)*

*How is the quality of **these specific notes?** [Take a short survey](https://google.qualtrics.com/jfe/form/SV_5bXzKQfylMIhSXc?confid=BKV5nE6tzO7gJsZU7hzMDxIQOBEBMgUIigIgABgECA&detailLevel=standard&hasImages=False&entryPoint=footerMain&isGoogler=False) to let us know your feedback, including how helpful the notes were for your needs.*