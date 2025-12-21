# I built Corgina - a privacy-first pregnancy tracker with voice AI (open source)

Hey everyone! I built this app for my wife during her pregnancy and just open-sourced it.

**The story:**
My wife was dealing with severe nausea and needed to track everything she ate and drank, but she found existing pregnancy apps invasive (selling data to advertisers) and too tedious to use when feeling sick. She needed something fast - just say "I ate a banana" and be done.

So I built her a voice-first tracker where all data stays 100% on her device. No cloud, no servers, no one selling her health data.

**What it does:**
Voice-first food, symptom, and nutrition tracking for pregnancy. Tap the mic, say what you ate, and it automatically logs it with nutrition data. That's it.

**Key features:**
- 🎤 Voice commands: "I ate 3 bananas for breakfast" → auto-logs with nutrition data
- 🔒 100% private: Everything stored locally on your iPhone
- 🤖 AI-powered: Uses your own OpenAI API key for nutrition estimation
- 🎨 Modern UI: Built with iOS 26's new Liquid Glass design language

**Tech stack:**
- SwiftUI + iOS 26 exclusive features
- On-device speech recognition
- GPT-4o for nutrition estimation (via user's API key)
- Actor-based concurrency for performance

**The catch:**
Right now it only works on iOS 26 (the latest beta). I'm planning to backport to iOS 17+ soon.

**Links:**
- GitHub: https://github.com/benjaminshafii/Corgina
- TestFlight: https://testflight.apple.com/join/5HV3CJ7x
- Quick demo: https://youtube.com/shorts/tOFTKZYpN6A?si=3zC5Mllkp6Y-Q0MD

It helped her stay on top of nutrition during a really tough time, and I figured other people might find it useful too.

Would love feedback from this community! Especially interested in:
1. Should I prioritize backporting to iOS 17?
2. What other health metrics would be useful?
3. Any UX suggestions from the demo?

Happy to answer questions about the tech implementation or design decisions!
