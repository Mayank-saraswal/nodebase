# DeepSeek operation matrix (Nodebase → Corsair)

Source: [@corsair-dev/deepseek](https://github.com/corsairdev/corsair/tree/main/packages/deepseek) (`deepseek.api.*`).

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Chat | createCompletion | CHAT, CHAT_COMPLETION |
| Anthropic | createMessage | ANTHROPIC_MESSAGE, CREATE_MESSAGE |
| User | getBalance | GET_BALANCE |
| Models | list | LIST_MODELS |

Models enum: `deepseek-chat` \| `deepseek-reasoner`. Completeness test asserts registry ⊇ all 4 endpoints.
