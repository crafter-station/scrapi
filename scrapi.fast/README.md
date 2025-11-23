# scrapi.fast

**scrapi.fast** utiliza técnicas de agente autónomo de última generación para realizar ingeniería inversa impulsada por IA para tareas de web scraping. Convierte cualquier sitio web en una API determinista, permitiendo a los desarrolladores solicitar datos limpios y estructurados usando simples instrucciones en lenguaje natural.

Construido con Next.js 16 y un backend TypeScript potenciado por Bun, aprovecha BrowserBase (Puppeteer) para automatización rápida y ofrece una UI pulida y lista para autenticación para generación de código autónoma confiable y extracción de datos.

## Características

- 🤖 **Agente IA Autónomo**: Analiza automáticamente sitios web y genera código de scraping
- ⚡ **Súper Rápido**: Automatización potenciada por BrowserBase para ejecución en milisegundos
- 🎯 **Lenguaje Natural**: Describe lo que quieres en inglés simple
- 🛡️ **Determinista**: Resultados consistentes y confiables incluso cuando los sitios web se actualizan
- 🔐 **Listo para Autenticación**: Integración integrada con Clerk para acceso seguro

## Comenzando

### Prerrequisitos

- Runtime [Bun](https://bun.sh)
- Node.js 20+ (para compatibilidad)
- Variables de entorno configuradas (ver `.env.example`)

### Instalación

```bash
# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys

# Ejecutar migraciones de base de datos
bun run db:push

# Poblar base de datos (opcional)
bun run db:seed
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación.

### Variables de Entorno

Variables de entorno requeridas:

- `BROWSERBASE_API_KEY` - API key de BrowserBase para automatización de navegador
- `BROWSERBASE_PROJECT_ID` - ID de proyecto de BrowserBase
- `V0_API_KEY` - API key del SDK v0 para generación de código con IA
- `DATABASE_URL` - String de conexión PostgreSQL (Neon)
- `CLERK_SECRET_KEY` - Secreto de autenticación de Clerk
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clave pública de Clerk

## Arquitectura

### Componentes Principales

- **Interfaz de Consulta** (`/dashboard`): UI principal para crear servicios de scraping
- **Rutas API**: Endpoints RESTful para gestión y ejecución de servicios
- **Tareas Trigger.dev**: Trabajos en segundo plano para scraping y generación de código
- **Integración SDK v0**: Generación de código y razonamiento impulsados por IA

### Flujo de Trabajo

1. El usuario proporciona URL + consulta en lenguaje natural
2. BrowserBase captura tráfico de red y estructura de página
3. La IA analiza datos y genera script de scraping
4. El script se prueba y refina automáticamente
5. El script validado se convierte en un endpoint de API determinista

## Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun
- **Lenguaje**: TypeScript
- **Base de Datos**: Drizzle ORM + Neon (PostgreSQL)
- **Autenticación**: Clerk
- **Automatización de Navegador**: BrowserBase + Puppeteer
- **IA/ML**: SDK v0
- **Trabajos en Segundo Plano**: Trigger.dev
- **UI**: Radix UI + Tailwind CSS + shadcn/ui

## Estructura del Proyecto

```
src/
├── app/              # Páginas y rutas API del app router de Next.js
├── components/       # Componentes React
├── db/              # Esquema y migraciones de base de datos
├── hooks/           # Hooks de React
├── lib/             # Funciones de utilidad y clientes
└── trigger/         # Tareas en segundo plano de Trigger.dev
```

## Scripts

- `bun dev` - Iniciar servidor de desarrollo
- `bun build` - Construir para producción
- `bun start` - Iniciar servidor de producción
- `bun lint` - Ejecutar linter Biome
- `bun format` - Formatear código con Biome
- `bun db:seed` - Poblar base de datos con datos de ejemplo

## Aprende Más

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Trigger.dev](https://trigger.dev/docs)
- [Documentación de BrowserBase](https://docs.browserbase.com)
- [Documentación del SDK v0](https://v0.dev/docs)

## Licencia

Proyecto privado - Todos los derechos reservados
