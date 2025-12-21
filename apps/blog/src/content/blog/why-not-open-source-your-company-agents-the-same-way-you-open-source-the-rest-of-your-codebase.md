---
title: "Why Not Open Source Your Company Agents?"
date: "2025-12-17"
---

we open-sourced something that probably shouldn't be open-sourced: how our company actually operates.

not the code. the process. how we find leads. how we draft messages. how we decide what matters.

it lives in our repo now, right next to the code. anyone can see it. run it. copy it.

maybe that's an amazing experiment. maybe it's completely useless. or maybe it's a real threat to our business.

i don't know yet. but here's how we got here.

## docs are dead on arrival

open source never really captured the underlying processes inside a company. sure, you'd share a code of conduct or instructions to replicate a dev environment.

but not how decisions are made. not how work actually flows. not how a company operates day to day.

you'll tell me your company has a notion. but here's the thing: most of those docs were dead on arrival.

everyone hates writing them. everyone hates reading them. they're read once, barely maintained, and then they just sit there.

## agents change this

agentic coding tools like cursor, opencode, or the claude cli let you define "rules" or "agents" in plain text. you can scope them at the repo level.

in other words: **process as agents**. just like infrastructure as code. how work gets done, how decisions are made, how systems are updated—all written down, versioned, and shared alongside the code.

you can write down your icp. you can explain how a process should work. you can encode how you do outreach, how you reply to users, how you decide what matters.

and because it runs, it gets exercised.

docs don't get exercised. that's why they rot.

agents do. if they're bad, you notice. if they're missing context, you fix them. they get less bad over time.

## clarity as a side effect

if the agent writes a bad message, it's usually because you didn't specify something. you didn't have a clear opinion. you didn't write it down.

so instead of clarity living in your head for one message, it lives in the agent. and the agent stays.

a message you send is gone forever. the company never benefits from the thinking that went into it.

an agent prompt sticks around. you improve it. and the next output is better. that compounds.

## what we actually open-sourced

at [0 finance](https://github.com/0-finance), our agents are in the repo. here's what they do:

**`@add-leads-to-tracker`** — finds leads matching our icp, enriches the data, adds them to our tracker. encodes who we're looking for and why.

**`@draft-message`** — writes outreach based on our voice, our positioning, what we've learned works. the first versions were terrible. they got better.

**`@update-crm`** — keeps our pipeline in sync. knows our deal stages, what moves something forward, what we care about tracking.

these started as ways to save time. but they became something else: a codified system you can build feedback loops on top of.

## the question

once process lives in the repo and actually runs, it's no longer "some insight in a founder's head." it's just another thing that executes.

people can see how the company operates. they can run it. they can fork it.

so why wouldn't you open source your company agents the same way you open source the rest of your codebase?

## what could go wrong

competitors could copy our gtm. they could see exactly how we find and qualify leads. they could steal our positioning, our voice, our approach.

or maybe none of that matters. maybe the process isn't the moat. maybe execution is. maybe the agents only work because of everything else around them.

we don't know yet.

but we shipped it anyway. because the upside—forcing clarity, sharing what we've learned, building in public—felt worth the risk.

check the repo. tell us if we're wrong.
