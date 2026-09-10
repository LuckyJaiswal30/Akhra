# Akhra

Every village in Jharkhand has an _akhra_—an open space where people gather to discuss local issues and decide on solutions. **Akhra** brings that idea online by connecting citizens, government, universities, and industry to transform community problems into real-world projects.

Built for **Smart India Hackathon 2026 – Problem Statement 43 (Government of Jharkhand).**

---

## The Problem

Three important stakeholders in Jharkhand rarely work together.

Citizens report thousands of local issues every year—unsafe drinking water, under-resourced schools, damaged roads, human-wildlife conflict, and many more. While these problems are documented, many never progress beyond being complaints.

Universities constantly look for meaningful project ideas, yet students often build solutions around artificial or hypothetical problems.

Industry has CSR funding, technical expertise, and manufacturing capability, but lacks a structured pipeline of validated community problems worth supporting.

**Akhra bridges these disconnected ecosystems** by creating a workflow where verified public issues become student-led projects supported by government and industry.

---

## Features

- Multilingual citizen issue reporting
- Photo and location-based submissions
- AI-powered duplicate detection
- Automatic issue categorisation and prioritisation
- Government verification workflow
- Explainable university department routing
- Student project lifecycle management
- Industry and CSR collaboration
- Progress tracking and citizen notifications
- Complete audit trail for administrative actions

---

## How It Works

1. A citizen reports a local problem with a photograph, location, and description in their preferred language.
2. AI categorises the issue and estimates its severity based on the reported impact.
3. Similar reports are grouped into a single community problem using semantic similarity.
4. Government officers review and validate the submission.
5. The problem is routed to the most suitable university department through explainable AI recommendations.
6. Students and faculty propose a practical solution.
7. Industry partners contribute funding, mentoring, or prototyping support.
8. Progress is tracked until deployment, and citizens receive updates throughout the process.

---

## Technical Highlights

### Semantic Duplicate Detection

Community members often describe the same issue using completely different wording. Traditional keyword matching fails in these situations.

Akhra uses semantic embeddings to compare the meaning of reports rather than their exact words, allowing duplicate complaints to be merged into a single community issue with a clearer estimate of its overall impact.

---

### Explainable University Routing

Every university department is represented through an expertise profile built from its academic domains and faculty research.

Incoming problems are matched against these profiles using vector similarity, allowing the system to recommend the most relevant department while also explaining why that recommendation was made. Government officers can review or override the recommendation whenever required.

---

## Technology Stack

| Category       | Technology                 |
| -------------- | -------------------------- |
| Framework      | Next.js 16 (App Router)    |
| UI             | Tailwind CSS v4, shadcn/ui |
| Backend        | Convex                     |
| Authentication | Clerk                      |
| AI             | Gemini with Groq fallback  |
| Embeddings     | `gemini-embedding-001`     |

---

## Security & Privacy

Akhra is designed to handle sensitive public reports responsibly.

- Role-based access control enforced through Clerk and Convex
- Administrative actions recorded through immutable audit logs
- Exact coordinates visible only to authorised government officers
- Universities and industry partners receive privacy-preserving location data
- AI models receive only the information required for classification and routing
- Photographs are served through short-lived signed URLs

---

## Demo Dataset

The project includes a curated dataset covering all **24 districts of Jharkhand** to demonstrate the complete workflow.

The dataset contains representative issues such as drinking water contamination, mining hazards, wildlife conflict, education, healthcare, sanitation, and infrastructure challenges, allowing the platform to simulate realistic reporting, verification, routing, and project management scenarios.

---

## Getting Started

Install dependencies.

```bash
pnpm install
cp .env.example .env.local
```

Start the Convex development server.

```bash
npx convex dev
```

Start the Next.js application.

```bash
pnpm dev
```

Configure the required Convex environment variables.

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-app>.clerk.accounts.dev
npx convex env set BOOTSTRAP_ADMIN_EMAIL you@example.com
npx convex env set GOOGLE_GENERATIVE_AI_API_KEY <key>
npx convex env set GROQ_API_KEY <key>   # Optional
```

Configure the Clerk JWT template.

```json
{
  "aud": "convex",
  "email": "{{user.primary_email_address}}"
}
```

Seed the demo data.

```bash
npx convex run seed:institutions
npx convex run seed:embedDepartments
npx convex run seed:problems
npx convex run seed:embedProblems
npx convex run seed:partners
```

Run the self-tests.

```bash
npx convex run selftest:runAll
```

---

## Testing

The project includes automated self-tests that validate:

- Dataset integrity
- Embedding generation
- Duplicate detection
- Department routing
- Authentication and authorisation
- District assignments
- Vector search consistency

---

## Team

- Lucky Jaiswal
- Chetan Pathak
- Shashank Mishra
- Kavya Srivastava
- Anshika Mishra
- Kavya Tripathi
