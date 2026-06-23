# 🔐 Phase 2: Auth & App Shell

This tracker covers the login form, client-side session storage (Zustand), silent refresh interceptors, and main dashboard layouts.

## 📋 Task List

| ID | Task | Status | Notes |
|----|------|--------|-------|
| A2.1 | Build login portal page (`/[locale]/(auth)/login`) | ✅ | Implemented premium dark/glassmorphic form using RHF + Zod |
| A2.2 | Hook up login form to `/api/auth/admin/login` | ✅ | Integrated with API backend via apiClient wrapper |
| A2.3 | Write 401 response silent token refresh interceptor | ✅ | Safe interceptor redirects or manages active tokens |
| A2.4 | Build dashboard logout trigger | ✅ | Implemented logout flow clearing Zustand state |
| A2.5 | Implement main layout responsive sidebar & header | ✅ | Responsive sidebar collapsible with mobile overlays |
| A2.6 | Build language toggle buttons | ✅ | Custom toggle switches locales inline dynamically |
| A2.7 | Resolve hydration race condition for persisted Zustand session | ✅ | Wait for Zustand persist hydration before executing auth guard redirects in layout |
