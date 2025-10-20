[Enlace a ST Memory Books (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) | [Enlace a ST Lorebook Ordering (STLO)](https://github.com/aikohanasaki/SillyTavern-LorebookOrdering)

# 🧠 La Guía Definitiva de Memoria: STMB + STLO

ST Memory Books (STMB) es esencial para **generar contenido de memoria**, y ST Lorebook Ordering (STLO) es esencial para **garantizar que ese contenido sea realmente utilizado** por la IA. Cuando se usan juntos, resuelven el problema central de la **Exclusión de Memoria**.

## Paso 1: Prepara el Escenario (La Base)

**Forzar "Ordenado Uniformemente":** Primero debes asegurarte de que la configuración predeterminada de Información Mundial (WI) de SillyTavern esté configurada para permitir que STLO tome el control. En la **Configuración de Información Mundial** de SillyTavern, establece la **Estrategia de Inserción de Información Mundial** en **"Ordenado Uniformemente"**. STLO requiere esta estrategia para eludir la rígida clasificación por categorías del código base de SillyTavern (Chat $\rightarrow$ Persona $\rightarrow$ etc.).

## Paso 2: Crea el Contenido de la Memoria (El Trabajo de STMB)

Usa STMB para crear automáticamente tus memorias a largo plazo.

1.  **Habilitar Resumen Automático:** Ve al panel de STMB (la varita mágica 🪄) y activa el **Resumen Automático**. Establece tu intervalo preferido (por ejemplo, **30 mensajes**).
2.  **Vincular/Crear Libro de Memorias:** Asegúrate de que tu chat tenga un Lorebook dedicado para las memorias. STMB generalmente colocará las memorias en un libro de tipo Global, pero a menudo usa el lorebook vinculado al chat por simplicidad.
3.  **Chatea Normalmente:** A medida que avanza tu chat, STMB genera automáticamente resúmenes densos, de alta calidad y estructurados. Estas memorias son ahora los "pasajeros" que intentan subir al "vuelo" limitado de contexto de la IA.

## Paso 3: Garantiza la Prioridad (El Trabajo de STLO)

Este es el paso más crítico. Debes usar STLO para reducir manualmente la prioridad de tu **libro de STMB vinculado al chat** mientras elevas tus **Esenciales del Personaje**.

### A. Rompe la Trampa de "El Chat Primero"
Por defecto, a un libro de memorias vinculado al chat se le da la **máxima prioridad** (El Chat Primero), arriesgándose a que use demasiado espacio de contexto y bloquee otros lorebooks de Mundo, Personaje y/o Persona. STLO te permite solucionar esto reasignando un nivel de prioridad personalizado y específico.

### B. La Pila de Prioridades Recomendada

Usa STLO para establecer prioridades personalizadas para todos los lorebooks relevantes:

| Lorebook/Memoria | Prioridad STLO Personalizada | ¿Por qué? (LA PILA) |
| :--- | :--- | :--- |
| **Esenciales del Personaje** (Personalidad, Descripción) | **Prioridad 5** (Máxima) | **Se Carga Primero** para fijar la identidad y la voz del personaje antes de que se cargue cualquier otra cosa. |
| **Libro de Memorias STMB** (Tus Memorias) | **Prioridad 4** (Alta) | **Se Carga Segundo.** Lo suficientemente alto para asegurar que la memoria se incluya, pero lo suficientemente bajo para garantizar que los esenciales se carguen primero. |
| **Lore de Persona** (Tu Identidad) | **Prioridad 3** (Predeterminada/Normal) | **Se Carga Tercero.** La información de identidad del usuario se ve después de la configuración central del personaje y las memorias críticas. |
| **Lore General/Aleatorio** (Recuerdos de Eventos, Lore del Mundo) | **Prioridad 1-2** (Mínima) | **Se Carga al Final.** La información menos crítica solo se incluye si queda espacio. |

### C. Establece un Límite de Presupuesto
Para el Libro de Memorias STMB (y cualquier otro lorebook denso), usa la función de **Presupuesto** de STLO para evitar que consuma todo el espacio, incluso si la prioridad es alta.

1.  Abre la configuración de STLO para tu lorebook de STMB.
2.  Establece un límite de **Presupuesto** (por ejemplo, **tokens fijos** como `5000`, o **Porcentaje de Contexto** como `15%`).
3.  Esto garantiza que incluso cuando el lorebook se procese temprano, se **recorte automáticamente** para respetar tu límite de capacidad, dejando espacio para todos los demás lorebooks de Prioridad 3, 2 y 1.
