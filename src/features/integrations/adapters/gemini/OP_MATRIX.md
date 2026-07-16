# Gemini operation matrix (Nodebase → Corsair)

Source: [@corsair-dev/gemini](https://github.com/corsairdev/corsair/tree/main/packages/gemini) (`gemini.api.*`).

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Content | generateContent, countTokens, embedContent | CHAT, COUNT_TOKENS, EMBED |
| Images | generateImage | IMAGE, GENERATE_IMAGE |
| Videos | generateVideos, getVideosOperation, waitForVideo | GENERATE_VIDEO, GET_VIDEO_OPERATION, WAIT_VIDEO |
| Models | listModels | LIST_MODELS |

Completeness test asserts registry ⊇ all 8 nested endpoints.
