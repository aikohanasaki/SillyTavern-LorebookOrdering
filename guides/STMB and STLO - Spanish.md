[Enlace a ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Enlace a ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 La Guía Definitiva de Memoria: STMB + STLO

ST Memory Books (STMB) es esencial para **generar contenido de memoria**, y ST Lorebook Ordering (STLO) es esencial para **garantizar que ese contenido sea realmente utilizado** por la IA. Cuando se usan juntos, resuelven el problema central de la **Exclusión de Memoria**.

## Paso 1: Prepara la Base

**Forzar "Ordenado Uniformemente":** Primero, asegúrate de que la configuración predeterminada de World Info (WI) en SillyTavern esté lista para que STLO tome el control. En la **Configuración de World Info** de SillyTavern, establece la **Estrategia de Inserción de World Info** en **"Ordenado Uniformemente"**. STLO necesita esta estrategia para eludir la rígida clasificación por categorías del código base de SillyTavern (Chat → Persona → etc.).

## Paso 2: Crea el Contenido de la Memoria (Trabajo de STMB)

Usa STMB para crear automáticamente tus recuerdos a largo plazo.

1.  **Habilita Resumen Automático:** Ve al panel de STMB (la varita mágica 🪄) y activa el **Resumen Automático**. Establece el intervalo que prefieras (por ejemplo, **30 mensajes**).
2.  **Vincula/Crea Libro de Memorias:** Asegúrate de que tu chat tenga un Lorebook dedicado para memorias. STMB normalmente pondrá memorias en un libro de tipo Global, pero suele usar el lorebook vinculado al chat por simplicidad.
3.  **Chatea con normalidad:** A medida que el chat avanza, STMB genera automáticamente resúmenes densos, estructurados y de alta calidad. Estas memorias son los "pasajeros" que intentan abordar el "vuelo" de contexto limitado de la IA.

## Paso 3: Garantiza la Prioridad (Trabajo de STLO)

Este es el paso más crítico. Debes usar STLO para bajar manualmente la prioridad de tu **libro STMB vinculado al chat** mientras elevas tus **Esenciales del Personaje**.

### A. Rompe la Trampa de "Chat Primero"
Por defecto, un libro de memorias vinculado al chat recibe la **prioridad más alta** (Chat Primero), con el riesgo de usar demasiado espacio de contexto y dejar fuera otros lorebooks de Mundo, Personaje y/o Persona. STLO te permite corregir esto reasignando un nivel de prioridad personalizado y específico.

### B. Pila de Prioridades Recomendada

Usa STLO para asignar prioridades personalizadas a todos los lorebooks relevantes:

### Entiende Prioridad vs Posición

**Posición** determina *dónde* aparece el contenido en el contexto (Char up, Char down, AN up/down, @D).  
**Prioridad** determina *protección presupuestaria*—qué sobrevive cuando se alcanza el límite de contexto.

Un número de prioridad más alto = mayor protección ante recortes. La prioridad funciona **dentro de cada posición**, no entre posiciones.

---

### Configuración Recomendada de Prioridades STLO

| Tipo de Lorebook/Memoria | Prioridad Recomendada | Justificación |
|:------------------------|:---------------------|:-------------|
| **Esenciales de Personaje** (Personalidad, Descripción, Rasgos Clave) | **Prioridad 5** (Máxima) | **Máxima protección.** La información de la tarjeta de personaje es la base de la identidad y comportamiento del bot. No debe perderse nunca. La posición suele establecerla el creador del bot (Char/AN down o @D). |
| **Lore del Mundo** (Ambientación, Facciones, Lugares, Reglas) | **Prioridad 4** (Alta, con límite presupuestario) | **Alta protección, pero controlada.** El lore del mundo da contexto esencial al bot. Debe limitarse para evitar exceso, pero protegido lo suficiente para no perder lo esencial. Se recorta después de los esenciales del personaje si es necesario. |
| **Persona** (Tu Identidad) | **Prioridad 2-3** (Media) | **Protección media.** La identidad de usuario es importante para respuestas personalizadas, pero el bot puede funcionar si se recortan algunos detalles. Menos crítico que el personaje o el mundo. |
| **Comandos/Instrucciones Generales** | **Prioridad 2-3** (Media) | **Protección media.** Instrucciones de comportamiento general y comandos de formato. Importante para la calidad de respuesta, especialmente si el creador lo coloca en @D, pero no tan crítico como la integridad del personaje. |
| **Memorias** (STMB, Eventos Recordados) | **Prioridad 1** (Mínima, con límite presupuestario) | **Mínima protección, recorte agresivo.** Las memorias suelen ir en Char up (inicio de contexto) y enriquecen más que ser esenciales. Si se activan muchas memorias, la mayoría puede recortarse sin romper el bot. El límite presupuestario evita que la memoria desplace información crítica. |

---

### Principios Clave

1. **Protege lo irreemplazable:** Los esenciales de personaje no pueden reconstruirse si se pierden.
2. **Presupuesta lo que puede crecer:** El lore del mundo y las memorias pueden desencadenar muchas entradas—limítalas.
3. **La posición es independiente:** Un ítem de Prioridad 1 en @D sigue saliendo abajo, pero será eliminado primero si el contexto se llena.
4. **Confía en el creador del bot:** Los buenos bots colocan instrucciones críticas en @D independientemente de tus ajustes de prioridad.

---

## C. Establece un Límite de Presupuesto

- **Esenciales del Personaje:** Sin límite (normalmente compacto)
- **Lore del Mundo:** Máximo 15,000–25,000 tokens
- **Persona:** Sin límite (normalmente compacto)
- **Comandos/Generales:** Sin límite (normalmente compacto)
- **Memorias:** Máximo 5,000–15,000 tokens (recorte agresivo)

1.  Abre la configuración de STLO para tu libro STMB.
2.  Establece un límite de **Presupuesto** (ejemplo, **tokens fijos** como `5000`, o **Porcentaje de Contexto** como `15%`).
3.  Esto garantiza que incluso si el lorebook se procesa primero, se **recorta automáticamente** para respetar tu límite, dejando espacio para los lorebooks de Prioridad 3, 2 y 1.

---

**Nota:** Algunas expresiones y detalles técnicos deben ser revisados por un hablante nativo de español familiarizado con la terminología de SillyTavern/STMB/STLO para asegurar precisión y coherencia.
