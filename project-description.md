# scrapi.fast

**scrapi.fast** es una plataforma de agente autónomo de última generación que realiza ingeniería inversa impulsada por IA para tareas de web scraping. Transforma cualquier sitio web en una API determinista, permitiendo a los desarrolladores solicitar datos limpios y estructurados usando simples instrucciones en lenguaje natural.

## Descripción General

Construido con Next.js 16 y un backend TypeScript potenciado por Bun, scrapi.fast aprovecha BrowserBase (Puppeteer) para automatización rápida y ofrece una UI pulida y lista para autenticación para generación de código autónoma confiable y extracción de datos.

## Características Principales

### 🤖 Arquitectura de Agente Autónomo
- **Ingeniería Inversa Impulsada por IA**: Utiliza técnicas avanzadas de LLM para analizar la estructura del sitio web y el tráfico de red
- **Generación Inteligente de Código**: Genera automáticamente scripts de scraping robustos basados en consultas en lenguaje natural
- **Refinamiento Iterativo**: Se auto-corrige y mejora scripts a través de ciclos de pruebas automatizadas

### ⚡ Automatización de Alto Rendimiento
- **Integración con BrowserBase**: Aprovecha la infraestructura Puppeteer de BrowserBase para automatización de navegador rápida y escalable
- **Análisis de Tráfico de Red**: Captura y analiza solicitudes/respuestas HTTP para identificar fuentes de datos
- **Extracción Inteligente de Datos**: Prioriza APIs JSON, patrones de datos embebidos y estrategias de parsing HTML

### 🎯 Experiencia del Desarrollador
- **Interfaz de Lenguaje Natural**: Describe lo que quieres en inglés simple - no se necesitan selectores complejos o XPath
- **APIs Deterministas**: Obtén resultados consistentes y confiables cada vez, incluso cuando los sitios web se actualizan
- **Monitoreo en Tiempo Real**: Observa al agente trabajar a través de las etapas de scraping, generación de código y pruebas
- **Listo para Autenticación**: Integración integrada con Clerk para acceso seguro multi-usuario

## Cómo Funciona

1. **Entrada del Usuario**: El desarrollador proporciona una URL y una consulta en lenguaje natural (ej: "Obtener nombres y precios de productos")

2. **Análisis de Red**: BrowserBase/Puppeteer captura todo el tráfico de red, logs de consola y estructura de página

3. **Análisis de IA**: El SDK v0 analiza los datos capturados para entender:
   - APIs JSON disponibles
   - Patrones de datos embebidos ej: (Next.js `__NEXT_DATA__`, JSON-LD, etc.)
   - Estructura HTML y selectores

4. **Generación de Código**: La IA genera un script de scraping en JavaScript que:
   - Usa la fuente de datos más confiable (prefiriendo APIs sobre parsing HTML)
   - Implementa manejo adecuado de errores
   - Incluye logs de depuración para solución de problemas

5. **Pruebas Automatizadas**: El script se prueba con ejemplos proporcionados, con reintentos automáticos y refinamiento

6. **Creación de API**: Una vez validado, el script se convierte en un endpoint de API determinista que puede ser llamado programáticamente

## Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Runtime Bun, Trigger.dev para tareas en segundo plano
- **Automatización de Navegador**: BrowserBase, Puppeteer
- **IA/ML**: SDK v0 para generación de código y razonamiento
- **Base de Datos**: Drizzle ORM con Neon (PostgreSQL)
- **Autenticación**: Clerk
- **Componentes UI**: Radix UI, Tailwind CSS, shadcn/ui

## Arquitectura

- **Rutas API**: Endpoints RESTful para creación, prueba y ejecución de servicios
- **Tareas en Segundo Plano**: Tareas Trigger.dev para scraping asíncrono y generación de código
- **Actualizaciones en Tiempo Real**: Streaming tipo WebSocket para actualizaciones de progreso en vivo
- **Gestión de Estado**: React Query (TanStack Query) para estado del servidor

## Casos de Uso

- Extracción de datos de productos de e-commerce
- Agregación de listados de eventos
- Scraping de noticias/artículos
- Listados de bienes raíces
- Recolección de datos de tableros de trabajo
- Extracción de contenido de redes sociales
- Cualquier dato estructurado de sitios web

## Beneficios

- **Sin Selectores Frágiles**: La IA se adapta automáticamente a los cambios del sitio web
- **Desarrollo Rápido**: Ve de la idea a una API funcional en minutos
- **Confiable**: Resultados deterministas con manejo adecuado de errores
- **Escalable**: Construido sobre la infraestructura de BrowserBase
- **Mantenible**: Código auto-documentado con lógica clara de extracción de datos
