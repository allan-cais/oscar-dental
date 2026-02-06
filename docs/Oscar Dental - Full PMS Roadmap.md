**Phase 1:** 

**Main Integrations for this Phase**

- **OpenDenta**l | PMS provider | Connect through OpenDental’s API | No limitations to push / post API functionality  
- **Eaglesoft** | PMS Provider | Connect through Koalla’s API | Not bidirectional, will lose XYZ functionality that needs to be scoped now

  **1: We will not be able to do smart scheduling because we cannot create, or modify appointment times. All appointments will have to be created manual. Can only READ appointments.**

  **2\. In the RCM process we will not be able to do payment processing because we cannot post payment information back to Eaglesoft. READ only restriction**

  **3\. Cannot update claim statuses or claim metadata READ only restriction**

  **4\. Cannot do “Text-To-Pay” because we cannot automatically reconcile payments from Stripe. Only way would to manually migrate payment records as they happen. Another READ only restriction**

  **5\. Analytics will rely on a lot of manual data.** 

- **Dentrix |** PMS Provider | Connect through Koallas API | Not bidirectional, will lose XYZ functionality that needs to be scoped now

  **1: We will not be able to do smart scheduling because we cannot create, or modify appointment times. All appointments will have to be created manual. Can only READ appointments.**

  **2\. In the RCM process we will not be able to do payment processing because we cannot post payment information back to Eaglesoft. READ only restriction**

  **3\. Cannot update claim statuses or claim metadata READ only restriction**

  **4\. Cannot do “Text-To-Pay” because we cannot automatically reconcile payments from Stripe. Only way would to manually migrate payment records as they happen. Another READ only restriction**

  **5\. Analytics will rely on a lot of manual data.** 

- **Vyne Dental** | Claim Submission Provider | Connect through Vyne’s API docs | Full API functionality only significant note is the $40k price tag per year   
- **Stripe** | Payment provider for Phase 1 and text-to-pay | Connect through Stripe’s API docs | Full API functionality / will still require additional resource for text-to-pay but this is the right provider just has a cost   
1. **No built in compliance layer. Will have to build out Hipaa and SOC 2 around stripe implementation.**  
2. **Stripe bluntly handles only the transaction and nothing else. Think it as “card 1 payed card 2.” but doesnt give any other information as why. We will have to build as layer to be able to track payments/partial payments/refunds/adjustments etc…**  
3. **We will need to use twilio or other SMS service along with Stripe.**   
4. **Build out SMS orchestration process, Secure the link, set reminders, retry logic.**  
5. **We need WRITE functionality for all other 3rd party PMS systems we use. Dentrix and Eaglesoft will not be able to automate payment posting.**   
- **Evoke Security** | Agentic security provider recommended by the client \- It’s unclear what they’d provide but would not directly perform SOC2 or really help with HIPPA | Need more clarity from client why to include them.

	**Twilio** | No critical limitations, but cost can add up with scale. 

**Phase 2:** 

**Main Integrations for this Phase**

- **NexHealth** | PMS Synchronization & Event Layer. (inventory management)  
  **\- Relies on PMS READ/WRITE restrictions. Our PMS needs both capabilities in order for NexHealth to work how we want it too.**  
- **OpenAI |** No other dependencies for key feature 2 or key feature 4 besides an LLM. 

   
**Phase 3:** 

**Main Integrations for this Phase**

- **Roboflow** | Computer Vision Platform |   
  - **Roboflow does not provide support for downloaded model weights used outside of its ecosystem [source](https://docs.roboflow.com/deploy/download-roboflow-model-weights). Use Roboflow for prototyping/experimentation only due to export limitations, unless it immediately meets accuracy requirements.**  
- **Whisper** | Voice Perio | Use Whisper or similar for transcription with manual entry fallback for errors. Include easy review of transcription output before finalizing.