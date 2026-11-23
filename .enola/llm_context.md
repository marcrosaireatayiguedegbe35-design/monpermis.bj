# Architecture Snapshot

## Repository Map

65 modules, 3160 symbols, grouped by area. Every module is in `facts.jsonl`, or query_facts(kind="module").

| Area | Modules | Symbols | Languages |
|------|---------|---------|-----------|
| `server` | 9 | 1118 | python, typescript |
| `mobile` | 17 | 905 | kotlin, typescript |
| `administration` | 16 | 554 | typescript |
| `src` | 12 | 479 | typescript |
| `moniteur` | 10 | 103 | typescript |
| `.` | 1 | 1 | typescript |

Largest modules:
- `administration/src/api` — 236 symbols (typescript)
- `server/src/services` — 221 symbols (typescript)
- `server/scripts` — 216 symbols (python)
- `mobile/src/api` — 190 symbols (typescript)
- `server/src/utils` — 186 symbols (typescript)
- `server/src/data/hardcodedQuestions` — 172 symbols (typescript)
- `mobile/src/components` — 168 symbols (typescript)
- `src/api` — 163 symbols (typescript)
- `mobile/src/utils` — 152 symbols (typescript)
- `server/src/routes` — 138 symbols (typescript)
- `mobile/src/screens` — 101 symbols (typescript)
- `server/src/models` — 91 symbols (typescript)
- `src/components` — 79 symbols (typescript)
- `server/src/middleware` — 78 symbols (typescript)
- `administration/src/pages` — 74 symbols (typescript)
- `mobile/src/screens/code-route` — 73 symbols (typescript)
- `src/utils` — 73 symbols (typescript)
- `mobile/src/data/codeRoute` — 58 symbols (typescript)
- `src/data/codeRoute` — 57 symbols (typescript)
- `src/pages` — 45 symbols (typescript)

## Extraction Quality

- Files parsed: **577** / 1957 seen (0 file(s) + 6 directory tree(s) skipped by ignore globs)
- Parse errors: 0

## Architecture Pattern

_No specific architecture pattern detected._

## Entry Points

304 handlers, 15 shown:
- **handler**: `server/scripts.rebuildAudioMaps` (server/scripts/apply-ch1-part2.mjs)
- **handler**: `server/scripts.rebuildImageAssets` (server/scripts/apply-ch1-part2.mjs)
- **handler**: `server/scripts/build-panneaux-catalog.apply_master_definitions` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.build` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.export_ts` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.extract_images` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.main` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.parse_master_definitions` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.parse_occurrences` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.pdf_text` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/build-panneaux-catalog.safe_name` (server/scripts/build-panneaux-catalog.py)
- **handler**: `server/scripts/transcribe-missing-audios.clean_transcript` (server/scripts/transcribe-missing-audios.py)
- **handler**: `server/scripts/transcribe-missing-audios.find_missing` (server/scripts/transcribe-missing-audios.py)
- **handler**: `server/scripts/transcribe-missing-audios.main` (server/scripts/transcribe-missing-audios.py)
- **handler**: `server/scripts/tts-panneaux.export_ts` (server/scripts/tts-panneaux.py)
- … and 289 more (query_facts(kind="route") for all)
- **main**: `server/scripts.main` (server/scripts/attach-course-videos.mjs)
- **main**: `server/scripts.main` (server/scripts/audit-question-audios.mjs)
- **main**: `server/scripts.main` (server/scripts/generate-ch1-part2-signs.mjs)
- **main**: `server/scripts.main` (server/scripts/migrate-audios-to-cloudinary.mjs)
- **main**: `server/scripts.main` (server/scripts/seed-conduite-content.mjs)
- **main**: `server/scripts.main` (server/scripts/seed-local-demo.mjs)
- **main**: `server/scripts.main` (server/scripts/seed-local-test.mjs)
- **main**: `server/scripts.main` (server/scripts/seed-revision-content.mjs)
- **main**: `server/scripts.main` (server/scripts/sync-reservations.mjs)
- **main**: `server/scripts.main` (server/scripts/tts-chapitre.mjs)
- **main**: `server/scripts.main` (server/scripts/verify-delete-account.mjs)
- **main**: `server/scripts.main` (server/scripts/wipe-keep-last-transaction.mjs)
- **main**: `server/scripts/build-panneaux-catalog.main` (server/scripts/build-panneaux-catalog.py)
- **main**: `server/scripts/transcribe-missing-audios.main` (server/scripts/transcribe-missing-audios.py)
- **main**: `server/scripts/tts-panneaux.main` (server/scripts/tts-panneaux.py)
250 routes, 15 shown:
- **route** DELETE `/api/admin/announcements/:id` (server/src/routes/adminAnnouncements.js)
- **route** DELETE `/api/admin/conduite/creneaux/:id` (server/src/routes/adminReservations.js)
- **route** DELETE `/api/admin/conduite/moniteurs/:id` (server/src/routes/adminReservations.js)
- **route** DELETE `/api/admin/conduite/reservations/:id` (server/src/routes/adminReservations.js)
- **route** DELETE `/api/admin/promo-codes/:id` (server/src/routes/adminPromoCodes.js)
- **route** DELETE `/api/admin/revision/chapters/:chapterId/audios/:questionOrder` (server/src/routes/adminChapterAudio.js)
- **route** DELETE `/api/admin/revision/chapters/:chapterId/images/:imageIndex` (server/src/routes/adminChapterImages.js)
- **route** DELETE `/api/admin/revision/chapters/:chapterId/questions/:questionId` (server/src/routes/adminQuestions.js)
- **route** DELETE `/api/admin/revision/chapters/:chapterId/test-subjects/:subjectId` (server/src/routes/adminQuestions.js)
- **route** DELETE `/api/admin/revision/courses/:courseId/modules/:moduleId` (server/src/routes/adminRevisionCourses.js)
- **route** DELETE `/api/admin/revision/courses/:courseId` (server/src/routes/adminRevisionCourses.js)
- **route** DELETE `/api/admin/users/:userId` (server/src/routes/adminUsers.js)
- **route** DELETE `/api/auth/account` (server/src/routes/auth.js)
- **route** DELETE `/api/moniteur/creneaux/:id` (server/src/routes/moniteurPortal.js)
- **route** DELETE `/auth/account` (src/api/auth-password.ts)
- … and 235 more (query_facts(kind="route") for all)

## Routes

250 routes, grouped by path prefix. query_facts(kind="route") for all of them.

| Prefix | Routes | Methods | Example |
|--------|--------|---------|----------|
| `/api` | 194 | DELETE, GET, HEAD, PATCH, POST, PUT | `/api/access-requests/:id/cancel` |
| `/auth` | 7 | DELETE, PATCH, POST | `/auth/account` |
| `/content` | 7 | GET, HEAD, POST | `/content/announcements` |
| `/Abonnement` | 1 | GET | `Abonnement` |
| `/ActualiteDetail` | 1 | GET | `ActualiteDetail` |
| `/Actualites` | 1 | GET | `Actualites` |
| `/ChapterCourses` | 1 | GET | `ChapterCourses` |
| `/ChapterQuestions` | 1 | GET | `ChapterQuestions` |
| `/ChapterQuestionsList` | 1 | GET | `ChapterQuestionsList` |
| `/ChapterTestSubject` | 1 | GET | `ChapterTestSubject` |
| `/CodeCours` | 1 | GET | `CodeCours` |
| `/CodeRoute` | 1 | GET | `CodeRoute` |
| `/Conduite` | 1 | GET | `Conduite` |
| `/CourseDetail` | 1 | GET | `CourseDetail` |
| `/ExamensTest` | 1 | GET | `ExamensTest` |
| `/ExamensTestTake` | 1 | GET | `ExamensTestTake` |
| `/ForgotPassword` | 1 | GET | `ForgotPassword` |
| `/HistoriquePaiements` | 1 | GET | `HistoriquePaiements` |
| `/Home` | 1 | GET | `Home` |
| `/Intro` | 1 | GET | `Intro` |
| `/LeconDetail` | 1 | GET | `LeconDetail` |
| `/LeconsChapitres` | 1 | GET | `LeconsChapitres` |
| `/LeconsCourses` | 1 | GET | `LeconsCourses` |
| `/Login` | 1 | GET | `Login` |
| `/MentionsLegales` | 1 | GET | `MentionsLegales` |
| `/MesNotes` | 1 | GET | `MesNotes` |
| `/MesReservations` | 1 | GET | `MesReservations` |
| `/Notifications` | 1 | GET | `Notifications` |
| `/Onboarding` | 1 | GET | `Onboarding` |
| `/PrivacyPolicy` | 1 | GET | `PrivacyPolicy` |
| `/Profile` | 1 | GET | `Profile` |
| `/Register` | 1 | GET | `Register` |
| `/RegisterPassword` | 1 | GET | `RegisterPassword` |
| `/ReservationConfirm` | 1 | GET | `ReservationConfirm` |
| `/ReservationFlow` | 1 | GET | `ReservationFlow` |
| `/ResetPassword` | 1 | GET | `ResetPassword` |
| `/RevisionChapitres` | 1 | GET | `RevisionChapitres` |
| `/RevisionPanneaux` | 1 | GET | `RevisionPanneaux` |
| `/RevisionPanneauxCategory` | 1 | GET | `RevisionPanneauxCategory` |
| `/TermsOfUse` | 1 | GET | `TermsOfUse` |
| `/VerifyEmail` | 1 | GET | `VerifyEmail` |
| `/access-requests` | 1 | GET | `/access-requests/me` |
| `/payments` | 1 | GET | `/payments/me` |
| `/tracking` | 1 | POST | `/tracking/events` |
| `/uploads` | 1 | GET | `/uploads/:kind/:filename` |

## Dependency Rules

- `.` -> `mobile/src/hooks`
- `.` -> `mobile/src/utils`
- `administration/src/components` -> `administration/src/ui`
- `administration/src/pages/code` -> `administration/src/ui`
- `administration/src/pages/conduite` -> `administration/src/ui`
- `administration/src/pages/tracking` -> `administration/src/ui`
- `administration/src/pages` -> `administration/src/api`
- `administration/src/pages` -> `administration/src/components/model`
- `administration/src/pages` -> `administration/src/context`
- `administration/src/pages` -> `administration/src/ui`
- `administration/src/pages` -> `administration/src/utils`
- `administration/src` -> `administration/src/api`
- `administration/src` -> `administration/src/components/model`
- `administration/src` -> `administration/src/context`
- `administration/src` -> `administration/src/hooks`
- `administration/src` -> `administration/src/utils`
- `mobile/src/components` -> `mobile/src/theme`
- `mobile/src/screens/code-route` -> `mobile/src/theme`
- `mobile/src/screens/conduite` -> `mobile/src/theme`
- `mobile/src/screens` -> `mobile/src/api`
- `mobile/src/screens` -> `mobile/src/context`
- `mobile/src/screens` -> `mobile/src/data/codeRoute`
- `mobile/src/screens` -> `mobile/src/hooks`
- `mobile/src/screens` -> `mobile/src/theme`
- `mobile/src/screens` -> `mobile/src/utils`
- `mobile/src/utils` -> `mobile/src/theme`
- `mobile/src` -> `mobile/src/api`
- `mobile/src` -> `mobile/src/components`
- `mobile/src` -> `mobile/src/context`
- `mobile/src` -> `mobile/src/data/codeRoute`
- `mobile/src` -> `mobile/src/hooks`
- `mobile/src` -> `mobile/src/utils`
- `mobile` -> `mobile/src/theme`
- `moniteur/src` -> `moniteur/src/api`
- `moniteur/src` -> `moniteur/src/components/model`
- `moniteur/src` -> `moniteur/src/context`
- `moniteur/src` -> `moniteur/src/hooks`
- `moniteur/src` -> `moniteur/src/utils`
- `server/src` -> `server/src/data/hardcodedQuestions`
- `server/src` -> `server/src/data`
- `server/src` -> `server/src/middleware`
- `server/src` -> `server/src/services`
- `server/src` -> `server/src/utils`
- `server` -> `server/src/models`
- `server` -> `server/src/services`
- `server` -> `server/src/utils`
- `src/pages` -> `src/api`
- `src/pages` -> `src/data/codeRoute`
- `src/pages` -> `src/hooks`
- `src/pages` -> `src/utils`
- `src` -> `src/api`
- `src` -> `src/data/codeRoute`
- `src` -> `src/hooks`
- `src` -> `src/utils`

## Critical Modules

| Module | Fan-In | Fan-Out | Criticality |
|--------|--------|---------|-------------|
| `mobile/src/theme` | 71 | 0 | high |
| `mobile/src/components` | 2 | 34 | high |
| `mobile/src/screens` | 0 | 27 | high |
| `administration/src/ui` | 22 | 0 | high |
| `administration/src/pages` | 0 | 21 | high |
| `administration/src` | 0 | 11 | high |
| `src/pages` | 0 | 11 | high |
| `mobile/src/screens/code-route` | 0 | 10 | high |
| `src` | 0 | 10 | high |
| `mobile/src/utils` | 8 | 1 | medium |

## Risk Zones

- **Cyclic dependency detected (6 modules)** (confidence: 100%): The following modules form a dependency cycle: administration/src -> administration/src/components -> administration/src/pages -> administration/src/pages/code -> administration/src/pages/conduite -> administration/src/pages/tracking -> administration/src. This can cause initialization issues, make refactoring harder, and indicates tight coupling.
- **Cyclic dependency detected (3 modules)** (confidence: 100%): The following modules form a dependency cycle: moniteur/src -> moniteur/src/components -> moniteur/src/pages -> moniteur/src. This can cause initialization issues, make refactoring harder, and indicates tight coupling.
- **Cyclic dependency detected (4 modules)** (confidence: 100%): The following modules form a dependency cycle: server/src/middleware -> server/src/models -> server/src/services -> server/src/utils -> server/src/middleware. This can cause initialization issues, make refactoring harder, and indicates tight coupling.
- **Cyclic dependency detected (6 modules)** (confidence: 100%): The following modules form a dependency cycle: src -> src/components -> src/pages -> src/pages/code-route -> src/pages/conduite -> src/pages/learner -> src. This can cause initialization issues, make refactoring harder, and indicates tight coupling.

---

*Generated at 2026-11-23T16:31:38Z in 1.617669615s. 6994 facts, 170 insights.*
