# 🏐 CVOrotava Team Manager

**CVOrotava Team Manager** es una aplicación web desarrollada con **Next.js (React)** que permite gestionar de forma centralizada toda la información deportiva del club: **partidos, calendarios, vídeos y estadísticas**, facilitando el acceso a entrenadores y jugadores desde cualquier lugar.

La aplicación utiliza **Supabase** como backend (base de datos y autenticación), cuenta con **frontend y backend integrados** gracias a Next.js (App Router) y dispone de **despliegue automático en Vercel** mediante commits.

---

## 🚀 Funcionalidades principales

* 🔐 **Autenticación**

  * Login mediante **Google**
  * Acceso restringido a **cuentas autorizadas**
* 🏐 **Gestión de partidos**

  * Crear, editar y eliminar partidos
  * Gestión de sets por partido
  * Resultados, notas y metadata
* 📊 **Estadísticas**

  * Visualización de estadísticas por temporada
* 🎥 **Vídeos**

  * Registro de vídeos de partidos (YouTube)
  * Asociación por temporada, género y competición
  * Notificaciones por email al registrar nuevos vídeos
* 📅 **Calendarios**

  * Organización de partidos por temporada
* ☁️ **Backend integrado**

  * API Routes con Next.js
  * Supabase como base de datos y auth
* 🔄 **Despliegue automático**

  * Integración continua con **Vercel**

> La aplicación está en evolución constante y se irán incorporando nuevas funcionalidades.

---

## 🧱 Stack tecnológico

* **Frontend**: React + Next.js (App Router)
* **Backend**: API Routes (Next.js)
* **Base de datos**: Supabase (PostgreSQL)
* **Autenticación**: Supabase Auth + Google OAuth
* **Emails**: Servicio propio (`lib/email`)
* **Despliegue**: Vercel (CI/CD por commits)
* **Estilos**: TailwindCSS

---

## 📁 Estructura del proyecto

```txt
src/
├── app/
│   ├── (protected)/              # Rutas protegidas por autenticación
│   │   ├── matches/               # Gestión de partidos
│   │   ├── videos/                # Gestión de vídeos
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/                       # Backend (API Routes)
│   │   ├── auth/
│   │   ├── matches/
│   │   ├── match_sets/
│   │   ├── seasons/
│   │   ├── stats/
│   │   ├── user/
│   │   ├── venues/
│   │   └── videos/
│   ├── login/                     # Página pública de login
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/                    # Componentes reutilizables
├── contexts/                      # Contextos globales (Auth, etc.)
├── hooks/                         # Custom hooks
├── lib/                           # Lógica compartida
│   └── supabase/
│       ├── admin.ts
│       ├── server.ts
│       ├── email.ts
│       ├── videos.ts
│       └── youtube.ts
├── utils/                         # Helpers y utilidades
└── emails/                        # Templates de emails
```

---

## 🔐 Autenticación y permisos

* Autenticación mediante **Google OAuth**
* Solo pueden acceder **usuarios previamente autorizados**
* Las rutas dentro de `(protected)` requieren sesión activa
* Supabase gestiona:

  * Usuarios
  * Sesiones
  * Tokens

---

## ⚙️ Instalación y configuración

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/tu-org/cvorotava-team-manager.git
cd cvorotava-team-manager
```

### 2️⃣ Instalar dependencias

Requiere [pnpm](https://pnpm.io/installation) (recomendado vía Corepack: `corepack enable`).

```bash
pnpm install
```

### 3️⃣ Variables de entorno

Crear un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_YOUTUBE_API_KEY=*****
NEXT_PUBLIC_SUPABASE_URL=*****
NEXT_PUBLIC_SUPABASE_ANON_KEY=*****
SUPABASE_SERVICE_ROLE_KEY=*****
RESEND_API_KEY=*****
RESEND_FROM_EMAIL=*****
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## ▶️ Ejecución en desarrollo

```bash
pnpm dev
```

La aplicación estará disponible en:

```
http://localhost:3000
```

---

## ☁️ Despliegue

El proyecto está configurado para **despliegue automático en Vercel**:

* Cada commit a la rama principal:

  * Ejecuta build
  * Despliega automáticamente
* Las variables de entorno se configuran desde el panel de Vercel

---

## 🧪 Estado del proyecto

* ✔ Base funcional completa
* ✔ Backend y frontend integrados
* ✔ Autenticación segura
* ✔ Gestión de partidos, vídeos y estadísticas
* 🚧 Nuevas funcionalidades en desarrollo:

  * Mejores estadísticas
  * Paneles avanzados
  * Mejoras en UX/UI

---

## 🤝 Contribución

Este proyecto está orientado al uso interno del club, pero se aceptan mejoras y refactors.

* Mantener consistencia con el stack actual
* Seguir la estructura de carpetas existente
* Documentar nuevas funcionalidades

---

## 📄 Licencia

Proyecto privado – uso exclusivo de **CVOrotava**.
