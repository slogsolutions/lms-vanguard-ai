# AI Agent Based Web Platform

## Project Documentation for Presentation

**Project Name:** AI Agent Based Web Platform  
**Purpose:** AI-assisted training, translation, and task support platform  
**Target Users:** Army officers, instructors, administrators, and soldiers  
**Core Highlight:** Offline Hindi-English translation using LibreTranslate through Docker  
**Document Type:** Project report and presentation reference

---

## 1. Introduction

The **AI Agent Based Web Platform** is a web-based system designed to help Army personnel use artificial intelligence in a simple, controlled, and task-focused manner. The platform provides one common place where users can log in, view training activities, use an AI workspace, perform translation, and track progress.

The system has been planned for non-technical and semi-technical users. A soldier or officer does not need to understand how artificial intelligence works internally. The user only selects an activity, enters the required text or instruction, and receives guided output from the system.

One of the most important parts of this project is the **offline translation module**. It uses **LibreTranslate**, which can run locally using Docker. This means Hindi-English translation can work without depending on public internet translation services. This is useful in training centres, restricted networks, and low-connectivity environments.

In simple terms, the platform combines:

- A login-based web portal.
- A soldier activity dashboard.
- An administrator dashboard.
- An AI-powered task workspace.
- Hindi-English translation support.
- Offline AI tool support.
- Progress and activity tracking.

The objective is to provide a disciplined, easy-to-use, and presentation-ready AI platform suitable for Army training and support activities.

---

## 2. Need of the System

Army users often need fast assistance for translation, training content, formal communication, summarization, and structured task preparation. However, many AI tools are built for general public use and may not be suitable for a controlled official environment.

### Current Challenges

- Users may face difficulty translating between Hindi and English.
- Many online AI tools require continuous internet connectivity.
- Sensitive internal text should not be entered into public AI websites.
- Non-technical users may not know how to ask AI tools properly.
- Training activities and user progress may become difficult to manage manually.
- Different tools for translation, chat, learning, and reporting create confusion.

### How This Project Helps

This system provides one organized platform where:

- Users can work inside a guided AI workspace.
- Translation can be performed locally.
- Activities can be assigned and tracked.
- Administrators can manage candidates.
- AI responses can remain focused on the selected task.
- Offline and online tools can be used according to requirement.

The system is therefore useful as a controlled AI training and productivity platform for Army-related use cases.

---

## 3. Objectives

The main objective of the project is to create a simple and reliable AI-enabled web platform for Army personnel.

---

## 4. Technical Roadmap & AI Strategy

The system is designed with a **Hybrid-Offline** architecture to ensure 100% security and mission continuity. 

### Key Technical Pillars:
- **Offline LLMs**: Mistral 7B, Llama 3, and Phi-3 via Ollama ($0 API cost).
- **Secure IDE**: Monaco Editor integration for offline coding and debugging.
- **Multimedia Generation**: Local Stable Video Diffusion and Coqui TTS for secure voice/video synthesis.
- **Enterprise Security**: All training data is processed on local servers using PostgreSQL.

> [!NOTE]
> For a detailed breakdown of models, libraries, and pricing, refer to the [LMS_VANGUARD_AI_ROADMAP.md](file:///c:/Users/krada/Desktop/LMS-SLOG/LMS_VANGUARD_AI_ROADMAP.md) file.

### Main Objectives

- To provide AI assistance through a clear web interface.
- To support Hindi-English translation using a local translation service.
- To reduce dependency on public online AI services.
- To provide activity-based learning and task support.
- To help administrators manage users and monitor progress.
- To provide a controlled environment for using AI tools.
- To make the platform usable for non-technical users.

### User-Oriented Objectives

- Soldiers should be able to log in easily.
- Soldiers should be able to view assigned activities.
- Soldiers should be able to open an AI workspace for each activity.
- Users should receive clear and formal AI responses.
- Users should be able to translate text between Hindi and English.
- Users should be able to continue work through saved chat history.

### Administration-Oriented Objectives

- Administrators should be able to register candidates.
- Administrators should be able to view user details.
- Administrators should be able to check training progress.
- Administrators should be able to manage learning content and activities.
- The platform should support future expansion for more AI services.

---

## 4. Complete Feature List

This section explains the major features of the platform in simple language.

### 4.1 Secure Login

The system provides login-based access. Only registered users can enter the platform.

Key points:

- User enters email and password.
- Password is checked securely.
- User session is created after login.
- Unauthorized users cannot access protected screens.

### 4.2 Role-Based Access

The platform supports different types of users.

Main roles:

- **Soldier/User:** Can view activities and use the AI workspace.
- **Administrator:** Can manage candidates, view progress, and add users.

This ensures that each user sees only the functions required for their duty.

### 4.3 Soldier Portal

The Soldier Portal is the main activity screen for trainees and soldiers.

Features:

- Displays all assigned activities.
- Shows activity title and description.
- Shows duration, category, difficulty, and mode.
- Allows filtering between all, offline, and online activities.
- Provides a button to open the AI workspace.

### 4.4 Admin Portal

The Admin Portal is used for candidate and user management.

Features:

- View registered candidates.
- Add new candidates.
- Search candidates by name or service ID.
- View rank, batch, unit, progress, and score.
- Monitor completion of training tasks.

### 4.5 AI Workspace

The AI Workspace is the main intelligent working area of the platform.

Features:

- Displays the selected activity.
- Shows the current task type.
- Provides AI chat support.
- Provides quick action buttons.
- Shows mission deliverables.
- Allows model selection.
- Supports offline and online AI models.
- Stores conversation history.

### 4.6 Translation Desk

The Translation Desk supports Hindi-English translation.

Features:

- Uses LibreTranslate locally.
- Can run without cloud translation services.
- Helps translate operational, training, or administrative text.
- Supports automatic source language detection.
- Can be configured for Hindi or English output.

### 4.7 Prompt Builder

The Prompt Builder helps users create better instructions for AI tools.

Features:

- Improves unclear prompts.
- Adds role, context, and expected output.
- Creates structured AI instructions.
- Helps non-technical users use AI more effectively.

### 4.8 Document Summarizer

The summarization mode helps users convert long information into short and useful points.

Features:

- Creates bullet-point summaries.
- Extracts key facts.
- Identifies action points.
- Creates executive summaries.

### 4.9 Quiz Maker

The Quiz Maker supports training and assessment preparation.

Features:

- Creates questions from given content.
- Can generate multiple-choice questions.
- Can provide answer keys.
- Can create easy-to-difficult question sets.

### 4.10 Voice Script Lab

The Voice Script Lab helps prepare content for narration or voice output.

Features:

- Converts rough text into voice-ready script.
- Adds tone and pause suggestions.
- Helps prepare narration material.

### 4.11 Video Prompt Studio

The Video Prompt Studio helps prepare structured prompts for video generation or video planning.

Features:

- Creates scene-by-scene ideas.
- Adds camera and style suggestions.
- Helps prepare a complete video generation prompt.

### 4.12 Format Converter

The Format Converter helps organize information into structured formats.

Features:

- Converts raw text into table-like structure.
- Helps prepare report-style content.
- Supports document-ready formatting.

### 4.13 Formal Communication Desk

This feature helps users prepare official messages.

Features:

- Drafts formal emails or letters.
- Improves tone and clarity.
- Creates respectful and structured communication.
- Useful for official correspondence.

### 4.14 Progress Tracking

The system records user progress for activities.

Features:

- Tracks pending, in-progress, and completed activities.
- Stores score where applicable.
- Stores the model used for the task.
- Helps administrators review training progress.

### 4.15 Chat History

The system stores user and AI messages.

Features:

- Keeps previous conversation records.
- Allows continuity in task discussion.
- Supports review of previous AI outputs.

### 4.16 AI Model Registry

The platform maintains a list of available AI models and tools.

Features:

- Shows offline models.
- Shows online models.
- Stores model name, provider, status, and description.
- Helps users select a suitable AI option.

---

## 5. Simple System Architecture

The system has three main parts:

- **User Interface:** What the user sees and operates.
- **Application Server:** The decision-making and processing layer.
- **AI and Data Services:** Translation, AI models, and stored records.

### Architecture Diagram

```text
                      +----------------------+
                      |   Army User / Admin  |
                      +----------+-----------+
                                 |
                                 v
                      +----------------------+
                      |      Web Portal      |
                      | Login, Dashboard, AI |
                      +----------+-----------+
                                 |
                                 v
                      +----------------------+
                      |   Application Server |
                      | Auth, Activities, AI |
                      +----+------------+----+
                           |            |
                           v            v
              +-------------------+   +----------------------+
              |  Local Database   |   |   AI Tool Services   |
              | Users, Progress,  |   | Translation, Chat,   |
              | Activities, Chats |   | Summary, Quiz, etc.  |
              +-------------------+   +----------+-----------+
                                                  |
                                                  v
                                    +--------------------------+
                                    | LibreTranslate / Ollama  |
                                    | Local Offline Services   |
                                    +--------------------------+
```

### Explanation for Officials

- The user works through the web portal.
- The application server receives the user request.
- The server checks login, activity, and selected AI mode.
- If translation is required, the request goes to local LibreTranslate.
- If general AI help is required, the request can go to an offline or online AI model.
- The database stores required records such as users, activities, chats, and progress.

---

## 6. Technology Used in Simple Terms

The platform uses standard web and AI support tools.

| Area | Tool Used | Simple Purpose |
|---|---|---|
| User Interface | React | Builds the screens used by soldiers and admins |
| Server | Node.js and Express | Handles requests and responses |
| Database | SQLite | Stores users, activities, chats, and progress |
| Database Connection | Prisma | Helps the server read and write database records |
| Translation | LibreTranslate | Performs Hindi-English translation locally |
| Local AI | Ollama | Runs offline AI models where available |
| Container | Docker | Runs LibreTranslate easily on a local machine |
| Security | Password hashing and login tokens | Protects user access |

The user does not need to interact with these tools directly during normal operation. They are used behind the platform to make the system work.

---

## 7. Main Workflow: User Login to Dashboard

This workflow explains how a user enters the system.

### Step-by-Step Process

1. User opens the platform in the browser.
2. User enters email and password.
3. System checks the credentials.
4. If credentials are correct, the user is allowed inside.
5. The dashboard opens according to the user's role.
6. Soldier users see activities.
7. Admin users see candidate and progress management options.

### Login Workflow Diagram

```text
+-------------+
| Open System |
+------+------+
       |
       v
+-------------+
| Enter Login |
+------+------+
       |
       v
+-------------------+
| Verify User Detail |
+------+------------+
       |
       v
+------------------+       No       +----------------+
| Details Correct? |--------------->| Show Error     |
+------+-----------+                +----------------+
       |
      Yes
       |
       v
+--------------------+
| Open User Dashboard|
+--------------------+
```

---

## 8. Soldier Activity Workflow

This workflow explains how a soldier uses the activity system.

### Step-by-Step Process

1. Soldier logs in.
2. Soldier opens the Activity List.
3. System displays all available activities.
4. Soldier can filter activities by offline or online mode.
5. Soldier selects one activity.
6. Soldier clicks **Explore in AI Workspace**.
7. System opens a dedicated AI workspace for that activity.
8. Soldier enters input or selects a quick action.
9. AI generates task-focused output.
10. System updates progress as in-progress or completed.

### Soldier Workflow Diagram

```text
+---------------+
| Soldier Login |
+-------+-------+
        |
        v
+----------------+
| Activity Portal|
+-------+--------+
        |
        v
+-----------------------+
| Select Training Task  |
+-------+---------------+
        |
        v
+-----------------------+
| Open AI Workspace     |
+-------+---------------+
        |
        v
+-----------------------+
| Enter Text / Request  |
+-------+---------------+
        |
        v
+-----------------------+
| Receive AI Assistance |
+-------+---------------+
        |
        v
+-----------------------+
| Progress Updated      |
+-----------------------+
```

---

## 9. Admin Workflow

This workflow explains how the administrator manages users and progress.

### Step-by-Step Process

1. Admin logs in.
2. Admin opens the Candidate Registry.
3. Admin views all registered users.
4. Admin can search by name or service ID.
5. Admin can add a new candidate.
6. Admin enters name, email, password, rank, batch, unit, and role.
7. System registers the candidate.
8. Admin reviews candidate progress and score.

### Admin Workflow Diagram

```text
+-------------+
| Admin Login |
+------+------+
       |
       v
+---------------------+
| Candidate Registry  |
+------+--------------+
       |
       +--------------------+
       |                    |
       v                    v
+--------------+     +----------------+
| View Users   |     | Add Candidate  |
+------+-------+     +-------+--------+
       |                     |
       v                     v
+--------------+     +----------------+
| Check Scores |     | Save New User  |
+------+-------+     +-------+--------+
       |                     |
       +----------+----------+
                  |
                  v
          +----------------+
          | Monitor Report |
          +----------------+
```

---

## 10. AI Workspace Workflow

The AI Workspace is the main area where users interact with the system's AI capability.

### Step-by-Step Process

1. User opens an activity.
2. System reads the activity details.
3. System identifies the activity type.
4. System selects the suitable AI workspace mode.
5. User enters a request or uses a quick action.
6. System sends the request for processing.
7. Correct AI tool handles the request.
8. Response is returned to the user.
9. Chat history is saved.
10. Activity progress is updated.

### AI Workspace Diagram

```text
+-------------------+
| Selected Activity |
+---------+---------+
          |
          v
+-------------------+
| Identify Task Type|
+---------+---------+
          |
          v
+----------------------------+
| Translation / Quiz / Summary|
| Prompt / Communication / AI |
+---------+------------------+
          |
          v
+-------------------+
| User Enters Input |
+---------+---------+
          |
          v
+-------------------+
| AI Tool Processes |
+---------+---------+
          |
          v
+-------------------+
| Output Displayed  |
+---------+---------+
          |
          v
+-------------------+
| Chat & Progress   |
| Saved             |
+-------------------+
```

---

## 11. Translation Workflow

The translation workflow is designed to keep translation simple for users and controlled for the organization.

### Step-by-Step Process

1. User opens a translation activity.
2. System opens the Translation Desk.
3. User enters Hindi or English text.
4. System sends the text to the backend.
5. Backend identifies the task as translation.
6. Backend sends the text to local LibreTranslate.
7. LibreTranslate translates the text.
8. Translated output is returned to the backend.
9. Output is displayed in the AI Workspace.
10. Translation conversation is saved.

### Translation Workflow Diagram

```text
+----------------------+
| User Enters Text     |
+----------+-----------+
           |
           v
+----------------------+
| Translation Desk     |
+----------+-----------+
           |
           v
+----------------------+
| Application Server   |
| Detects Translation  |
+----------+-----------+
           |
           v
+----------------------+
| Local LibreTranslate |
| Running in Docker    |
+----------+-----------+
           |
           v
+----------------------+
| Translated Text      |
+----------+-----------+
           |
           v
+----------------------+
| Display to User      |
+----------------------+
```

### Why This Is Useful

- Translation can work locally.
- It reduces dependency on public websites.
- It is simple for users.
- It supports training and communication needs.
- It can be deployed on a local machine or internal network.

---

## 12. Offline AI Workflow

Offline AI support is important when internet access is unavailable or not preferred.

### Step-by-Step Process

1. User selects an offline model.
2. User enters a question or task.
3. Application server sends the request to the local AI service.
4. Local AI model generates the answer.
5. Answer is returned to the user.
6. Chat is stored for future reference.

### Offline AI Diagram

```text
+-------------+
| User Request|
+------+------+
       |
       v
+--------------------+
| Application Server |
+------+-------------+
       |
       v
+--------------------+
| Local AI Service   |
| Ollama / Local Tool|
+------+-------------+
       |
       v
+--------------------+
| AI Response        |
+------+-------------+
       |
       v
+--------------------+
| Display & Save     |
+--------------------+
```

---

## 13. Data and Record Workflow

The system stores only the information needed for login, activities, progress, and AI conversation history.

### Records Maintained

- User name, email, role, rank, batch, unit, and service ID.
- Activity title, description, category, duration, and difficulty.
- User progress, score, and activity status.
- AI model name, provider, and status.
- Chat sessions and messages.

### Data Flow Diagram

```text
+-------------+       +--------------------+       +----------------+
| User Action | ----> | Application Server | ----> | Local Database |
+-------------+       +--------------------+       +----------------+
       ^                                                   |
       |                                                   v
       +-------------- Result Returned --------------------+
```

### Purpose of Stored Data

- To maintain user records.
- To track training activity progress.
- To keep chat history for continuity.
- To support administrator review.
- To improve structured learning management.

---

## 14. Deployment Steps

This section explains how to run the project for demonstration or local deployment.

### Required Software

Install these before running the project:

- Node.js
- npm
- Docker Desktop
- Git
- Optional: Ollama for offline AI chat support

### Step 1: Open the Project Folder

Open the project directory:

```text
LMS-SLOG
```

### Step 2: Install Backend

Open terminal inside the `server` folder and run:

```bash
npm install
```

### Step 3: Install Frontend

Open terminal inside the `client` folder and run:

```bash
npm install
```

### Step 4: Configure Server Settings

Create or update the file:

```text
server/.env
```

Recommended local settings:

```env
PORT=5000
JWT_SECRET=change_this_to_a_strong_secret
DATABASE_URL="file:./dev.db"

LIBRETRANSLATE_URL=http://localhost:5001
TRANSLATE_TARGET=hi

OLLAMA_URL=http://localhost:11434
MODEL=llama3.2:1b
OLLAMA_TIMEOUT_MS=120000
```

### Step 5: Start LibreTranslate with Docker

Run:

```bash
docker run -it -p 5001:5000 libretranslate/libretranslate
```

This starts the local translation service at:

```text
http://localhost:5001
```

### Step 6: Prepare the Database

Inside the `server` folder, run:

```bash
npm run db:setup
```

This prepares the local database and creates initial records.

### Step 7: Start the Backend

Inside the `server` folder, run:

```bash
npm run dev
```

Backend address:

```text
http://localhost:5000
```

### Step 8: Start the Frontend

Inside the `client` folder, run:

```bash
npm run dev
```

Frontend address:

```text
http://localhost:5173
```

### Step 9: Open the Platform

Open the browser and visit:

```text
http://localhost:5173
```

### Step 10: Demonstrate the System

For presentation:

- Login to the system.
- Show Soldier Portal.
- Open an activity.
- Open AI Workspace.
- Demonstrate translation.
- Show Admin Portal.
- Show candidate progress.

---

## 15. Suggested Presentation Flow

For Army officials, the project can be presented in the following order:

1. Explain the problem: language support, AI guidance, and offline requirement.
2. Explain the solution: one AI-enabled web platform.
3. Show login and dashboard.
4. Show Soldier Portal and activity cards.
5. Open AI Workspace.
6. Demonstrate Hindi-English translation.
7. Show Admin Portal and candidate progress.
8. Explain offline working using Docker and LibreTranslate.
9. Discuss advantages.
10. Discuss future improvements.

This flow keeps the presentation practical and easy to understand.

---

## 16. Advantages

### For Army Users

- Easy to use for non-technical personnel.
- Provides one platform for multiple AI-assisted tasks.
- Supports Hindi-English translation.
- Helps prepare summaries, quizzes, prompts, and formal communication.
- Keeps responses focused on selected activities.

### For Training Centres

- Helps organize learning activities.
- Tracks candidate progress.
- Supports guided AI-based training.
- Reduces manual effort in preparing learning material.
- Can be demonstrated and deployed locally.

### For Operational Control

- Translation can be performed locally.
- Offline AI support reduces dependency on internet services.
- System can be used in controlled network environments.
- Online tools can be limited based on policy.

---

## 17. Limitations

The current version is suitable for demonstration, training, and controlled use. Some limitations remain:

- Translation quality depends on the local LibreTranslate service.
- Language switching currently depends on configuration.
- File upload for documents can be improved.
- Large-scale deployment may require a stronger database.
- Production use will require stronger security review.
- Online AI tools must be used carefully for sensitive content.
- Offline AI models may require a capable computer system.

These limitations are normal for a developing project and can be addressed in future versions.

---

## 18. Future Enhancements

The project can be improved with the following additions:

- Add direct language selection in the user interface.
- Add one-click Hindi to English and English to Hindi buttons.
- Add document upload for PDF, Word, and Excel files.
- Add voice input and voice output.
- Add speech translation support.
- Add stronger administrator reports.
- Add detailed progress analytics.
- Add printable training reports.
- Add local network deployment package.
- Add Docker Compose for easier setup.
- Add stronger access control for different user ranks.
- Add audit logs for important actions.
- Add mobile-friendly interface improvements.
- Add multilingual user interface.
- Add automatic health check for translation and AI services.
- Add secure production deployment support.

---

## 19. Conclusion

The **AI Agent Based Web Platform** is a practical and useful software project for AI-assisted training and task support. It brings together user login, activity management, AI workspace, translation, progress tracking, and administration in one platform.

The system is especially suitable for Army-related presentation because it focuses on:

- Simplicity.
- Controlled AI usage.
- Offline translation.
- Guided task support.
- Progress monitoring.
- Practical deployment.

The platform demonstrates how artificial intelligence can be used responsibly in a structured official environment. It does not expect every user to be technically skilled. Instead, it gives users a clear interface and task-based support.

In its current form, the project is suitable for demonstration and final-year or industry-level project presentation. With future improvements, it can be expanded into a stronger training and productivity platform for larger controlled environments.

---

## 20. Simple Final Summary

This project is a web platform for Army users. A soldier can log in, see training activities, open an AI workspace, and get help from AI. The platform can translate Hindi and English using LibreTranslate running locally through Docker. Admin users can add candidates and check their progress.

Simple explanation:

- **Frontend:** The screen used by the user.
- **Backend:** The system that processes requests.
- **Database:** The place where users, activities, chats, and progress are stored.
- **LibreTranslate:** The local translation service.
- **Docker:** The tool used to run LibreTranslate locally.
- **Ollama:** Optional offline AI support.

The main value of the project is that it makes AI easier, safer, and more useful for structured Army training and support activities.

