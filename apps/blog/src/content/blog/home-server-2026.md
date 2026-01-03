---
title: "Home Server 2026"
date: "2026-01-02"
---


### **Motivation**

- AI models are good at running for long periods of time and executing more complex tasks.
    
- It’s now possible to do more than ever from fewer interfaces. From completing painful government tax software to finding deals on Facebook Marketplace. Many of these workflows are still hard or impossible to automate from large remote servers.
    
- A lot of these tasks require highly sensitive credentials.
    
- Running long-lived tasks on equivalent remote servers is ~8–10x more expensive on a yearly basis.


  

Being productive in 2026 will be about:

- spending more time thinking and writing
    
- spending less time clicking and context switching
    
- creating self-improving systems
    

  

Lights are controlled by interfaces

Sound is controlled by interfaces

Robot vacuum is controlled by interfaces

(Heating not connected yet)

---

### **Core Principles**

1. **Self-aware**
	 The system knows that it can reference its own code and understand its quirks
2. **Self-building**
    The system constructs what it needs when it needs it.
3. **Self-improving**
    The system updates its own docs, prompts, and skills when things don’t work.
4. **Self-fixing**
    The system detects broken states and attempts repair automatically.
5. **Reconstructable** / **Protable**
    The system can rebuild its state from scratch by prompting the user to provide core information.
7. **Open source**
    Shareable and inspectable as-is.
8. **Boring where possible**
    Prefer open standards, existing tools, and predictable failure modes.
9. **Graceful degradation**
    If credentials or permissions are missing, the system guides the user to obtain them.

---

### **Constraints**

- Runs at home
    
- Can execute authenticated browsers for tasks without APIs
    
- Can be secured
- Has access to lots of secrets 

    
- Accessible from outside the local network
    
- Multi-user
    
- Designed primarily for high-trust users
    
- Supervisor system to keep tasks alive
    
- Task scheduling
    

---

## **Future Planning**

- Prepare for distributed local LLMs (exa)
    
- Add a voice-first interface to control the system while on the move
    

---

## **Unsure Aspects**

- How isolated services should be
    
    (Docker vs native processes, especially on macOS where Docker may be constraining)
    

---

## **Examples**

- Deploying a simple SES email service and testing it end-to-end without human intervention
    
- Sending the robot vacuum to the kitchen at regular intervals
    

---

## **Starting Point Technologies**

  

**Software**

- opencode (primarily via plugins)
    
- chrome MCP server
    
- claude opus 4.5 as the main driver
    
- prepare for local models

- Most secrets provided via CLI bitwarded
  

**Hardware**

- mac studio
    
