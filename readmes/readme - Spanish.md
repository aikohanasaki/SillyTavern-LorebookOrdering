# 📚 Ordenación de Libros de Lore (Una Extensión de SillyTavern)

---

🌐 **Consulta también la guía detallada en español:**
👉 [Guía de STMB y STLO (Español)](../guides/STMB%20and%20STLO%20-%20Spanish.md)

Una extensión de SillyTavern que añade gestión de prioridades y presupuesto a nivel de libro de lore a la Información Mundial. Permite un control completo sobre qué libros de lore se activan primero y limita los libros de lore "hambrientos". Perfecto para usuarios con múltiples libros de lore que necesitan un control detallado sobre el comportamiento de la Información Mundial.

---

💡 **¿Quieres aprovechar al máximo la gestión de memoria?**
¡Utiliza STLO junto con [SillyTavern-MemoryBooks (STMB)](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) para obtener los mejores resultados!  
Consulta la [Guía STMB + STLO](../guides/STMB%20and%20STLO%20-%20Spanish.md) para consejos de configuración y cómo asegurar la prioridad de tus memorias.

---

🆕 **¡Ahora es compatible con sustituciones específicas de personajes en chats grupales y ajuste preciso del orden!**

**📋 [Historial de Versiones y Registro de Cambios](CHANGELOG.md)**

## Preguntas Frecuentes
Se accede a los ajustes a través del botón "Ordenación de Libros de Lore" en el panel de Información Mundial (aparece junto al cuadro de búsqueda cuando hay libros de lore disponibles).

![STLO Button](https://github.com/aikohanasaki/imagehost/blob/main/STLO.png)

---

## 📋 Requisitos Previos

- **SillyTavern:** 1.13.5+ (se recomienda la última versión)
- **Estrategia de Información Mundial:** DEBE usar la estrategia de inserción "uniforme" para que STLO funcione
- **Múltiples Libros de Lore:** La extensión es más útil cuando tienes múltiples libros de lore que necesitan priorización

## 💡 Configuraciones Recomendadas para la Activación Global de World Info/Libro de Lore
Probado con estos ajustes:

- **Estrategia de Inserción:** "uniforme" (requerido para que STLO funcione)
- **Pasos Máximos de Recursión:** 2 (recomendación general)

---

## 🚀 Empezando

### 1. **Instalar y Configurar**
- Instala la extensión en tu carpeta de extensiones de SillyTavern
- Asegúrate de tener varios libros de lore disponibles
- Establece la estrategia de inserción de Información Mundial en "uniforme" en los ajustes de SillyTavern

![Extension Button](https://github.com/aikohanasaki/imagehost/blob/main/settings.png)

### 2. **Acceder a los Ajustes**
- Abre el panel de Información Mundial en SillyTavern
- Busca el botón "Ordenación de Libros de Lore" junto al cuadro de búsqueda
- Haz clic para abrir el modal de gestión de libros de lore

### 3. **Configurar Prioridades**
- Selecciona un libro de lore del menú desplegable
- Establece el nivel de prioridad (1=Más bajo a 5=Más alto, 3=Predeterminado)
- Establece el presupuesto (si lo deseas)
- Configura el ajuste de orden si es necesario
- Guarda y repite para otros libros de lore

![Basic (global) settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20basic.png)

---

## ⌨️ Comando de Barra: /stlo

Abre el modal de Prioridad y Presupuesto de STLO para un libro de lore específico directamente desde la entrada de chat.

- Descripción: Accede rápidamente a la configuración de STLO para un libro de lore determinado.
- Uso:
  ```
  /stlo <nombre del libro de lore>
  ```
- Argumento:
  - nombre del libro de lore (no distingue mayúsculas y minúsculas). Puedes escribir nombres con espacios sin comillas; las comillas son opcionales.
- Ejemplos:
  - `/stlo Mi Libro de Lore`
  - `/stlo "Lore del Mundo"`
  - `/stlo Alice`

Qué hace:
- Selecciona el libro de lore correspondiente en el editor de Información Mundial.
- Abre el modal de Ordenación de Libros de Lore de ST para ese libro de lore.

Notas:
- Requiere un archivo de Información Mundial existente. Si no hay ninguno seleccionado/disponible, verás: “Crea o selecciona primero un archivo de Información Mundial.”
- Si el nombre no coincide con ningún libro de lore, verás: “Libro de lore no encontrado: NOMBRE”
- Si omites el nombre del libro de lore, verás la sugerencia de uso: “Uso: /stlo <nombre del libro de lore>”
- STLO sigue requiriendo la estrategia de inserción “uniforme” para que la ordenación y los presupuestos funcionen.

---

## 🎯 Niveles de Prioridad

### **Sistema de Prioridades**
- **Máxima (5):** Las entradas del libro de lore se activan primero y tienen prioridad en la asignación del presupuesto
- **Alta (4):** Prioridad más alta que la predeterminada
- **Predeterminada (3):** Comportamiento estándar de SillyTavern (sin cambios respecto al original)
- **Baja (2):** Prioridad más baja que la predeterminada
- **Mínima (1):** Las entradas del libro de lore se activan al final

### **Cómo Funciona**
- Los libros de lore de mayor prioridad se procesan primero durante la activación de la Información Mundial
- Solo funciona con la estrategia de inserción "uniforme"

---

## 📊 Sistema de Ajuste de Orden

### **Ajuste Fino Más Allá de la Prioridad**
El Sistema de Ajuste de Orden permite un control preciso sobre el orden de procesamiento de las entradas del libro de lore dentro del mismo nivel de prioridad:

- **Rango de Ajuste:** valores de -10,000 a +10,000 añadidos sobre los cálculos de prioridad
- **Control Preciso:** Ajusta el orden de procesamiento sin cambiar los niveles de prioridad
- **Fórmula Matemática:** `Orden Final = Prioridad × 10,000 + Ajuste de Orden + Orden de Entrada Original`

### **Ejemplo de Uso**
```
Libro de Lore A: Prioridad 3, Ajuste de Orden +250
Libro de Lore B: Prioridad 3, Ajuste de Orden -100
Libro de Lore C: Prioridad 3, Ajuste de Orden 0 (predeterminado)

Orden de Procesamiento Final:
1. Libro de Lore A: 30,250 + orden de entrada (se procesa primero)
2. Libro de Lore C: 30,000 + orden de entrada (predeterminado)
3. Libro de Lore B: 29,900 + orden de entrada (se procesa al final)
```

### **Controles de Chat Grupal**
- **Aplicar Siempre:** El ajuste de orden funciona tanto en chats individuales como grupales (predeterminado)
- **Solo Chats Grupales:** Marca esta opción para aplicar el ajuste de orden solo durante los chats grupales
- **Sustituciones de Personajes:** Establece diferentes ajustes de orden para personajes específicos en chats grupales

### **Cuándo Usar el Ajuste de Orden**
- **Personaje vs Mundo:** Aumenta ligeramente los libros de lore específicos de personajes por encima de la información mundial general
- **Jerarquía del Lore:** Asegura que el lore crítico se procese antes que la información suplementaria
- **Gestión de Memoria:** Ajusta cuándo se activan las memorias/entradas de LTM en relación con otro contenido
- **Prioridades de Diálogo:** Controla cuándo se activan los libros de lore relacionados con el diálogo en las conversaciones

---

## 🎭 Sustituciones de Personajes en Chats Grupales

![Group Chat Specific Settings](https://github.com/aikohanasaki/imagehost/blob/main/STLO%20group.png)

### **Personalización por Personaje**
En los chats grupales, diferentes personajes ahora pueden tener diferentes comportamientos del libro de lore durante sus turnos individuales:

- **Prioridades Específicas del Personaje:** Alice podría usar un libro de lore con Prioridad 5, mientras que Bob usa el mismo libro de lore con Prioridad 2
- **Ajuste de Orden Individual:** Cada personaje puede tener valores de ajuste de orden personalizados para el mismo libro de lore

### **Cómo Funcionan las Sustituciones en Chats Grupales**
1. **Configurar Sustitución:** En los ajustes del libro de lore, expande la sección "Sustituciones en Chats Grupales"
2. **Seleccionar Personajes:** Elige qué personajes obtendrán ajustes especiales para este libro de lore
3. **Establecer Valores Personalizados:** Cada personaje puede tener ajustes únicos de prioridad y orden
4. **Aplicación Automática:** Durante el chat grupal, cuando sea el turno de Alice, ella usará sus ajustes de sustitución; cuando sea el turno de Bob, él usará los suyos

### **Escenarios de Ejemplo**
- **Libro de Lore Centrado en el Personaje:** Establece el libro de lore personal del personaje en Prioridad 5 para ellos, y Prioridad 1 para los demás
- **Especialización del Lore:** El personaje erudito obtiene alta prioridad en los libros de lore académicos, mientras que el guerrero obtiene baja prioridad
- **Ajuste Fino del Orden:** Aumenta el contenido específico del personaje con ajustes de orden positivos

### **Notas Importantes**
- **Comportamiento en Chat Individual:** Las sustituciones de personajes se ignoran en los chats de un solo personaje (se utilizan los ajustes predeterminados del libro de lore)
- **Lógica de Respaldo:** Los personajes sin sustituciones específicas utilizan los ajustes predeterminados del libro de lore
- **Sin Conflictos:** Cambiar de un chat grupal a uno individual borra automáticamente el estado de sustitución

---


## ⚙️ Ajustes y Configuración

### **Ajustes por Libro de Lore**
- **Prioridad:** escala de 1 a 5 con etiquetas descriptivas
- **Ajuste de Orden:** ajusta el orden de procesamiento dentro de los niveles de prioridad
- **Controles de Presupuesto:** limita la cantidad del presupuesto de Información Mundial/contexto que cada libro de lore puede usar.
  - **Predeterminado:** sin límite por libro de lore (sin recorte de STLO); SillyTavern decide. STLO solo ordena las entradas.
  - **% del presupuesto de Información Mundial:** restringe este libro de lore a un porcentaje del total de tokens de Información Mundial.
  - **% del Contexto Máximo:** restringe por porcentaje de la ventana de contexto máxima utilizable del modelo.
  - **Tokens fijos:** establece un límite de tokens específico para este libro de lore.
  - Los presupuestos se calculan utilizando el tamaño de contexto predominante de `getMaxContextSize()`, y la aplicación requiere la estrategia “uniforme”.
  - **Consejo:** El valor predeterminado (0) permite que SillyTavern gestione el presupuesto. Un valor fijo de 1 bloqueará el libro de lore.
- **Autoguardado:** los ajustes se guardan automáticamente al cambiarlos

### **Comportamiento Global**
- **Validación de Estrategia:** detecta automáticamente si se requiere la estrategia "uniforme"
- **Advertencias Inteligentes:** solo muestra advertencias de compatibilidad durante la generación real (no al cargar el chat)
- **Seguimiento de Generación:** distingue entre saludos automáticos y generación iniciada por el usuario

---

## 🚨 Compatibilidad y Advertencias

### **Requisitos de Estrategia**
STLO requiere la estrategia de inserción de Información Mundial "uniforme" para funcionar. Cuando la extensión detecta:
- se han configurado ajustes especiales para el libro de lore
- la estrategia NO está establecida en "uniforme"

Verás una ventana emergente de advertencia con opciones para:
- **Detener Generación:** detiene la generación para corregir los ajustes primero
- **Desactivar STLO:** continúa sin la ordenación de libros de lore

### **Mejores Prácticas**
- Usa siempre la estrategia "uniforme" cuando STLO esté activo
- Prueba los ajustes de prioridad primero con una conversación corta
- Usa el ajuste de orden con moderación para ajustes finos

---

## 🔧 Uso Avanzado

### **Escenarios con Múltiples Libros de Lore**
- **Personaje + Mundo:** establece la prioridad del libro de lore del personaje en Alta/Máxima
- **Recuerdos/LTM:** establece la prioridad de los recuerdos en la más baja
- **Control de Orden:** usa el ajuste de orden para un control detallado dentro de los niveles de prioridad

### **Estrategias Avanzadas para Chats Grupales**
- **Especialización de Personajes:** da a cada personaje una alta prioridad en sus libros de lore relevantes
  - Erudito: alta prioridad en el libro de lore "Teoría Mágica", prioridad Normal en "Tácticas de Combate"
  - Guerrero: alta prioridad en el libro de lore "Tácticas de Combate", baja prioridad en "Teoría Mágica"
- **Ajuste Fino del Orden:** usa el ajuste de orden para potenciar el contenido específico del personaje
  - Libros de lore específicos del personaje: +500 de ajuste de orden para ese personaje
  - Libros de lore generales: 0 de ajuste de orden (predeterminado)
- **Consistencia del Lore:** asegura que la información específica del personaje solo aparezca durante sus turnos
  - Libros de lore de trasfondo del personaje establecidos en Prioridad 5 para ese personaje, y Prioridad 1 para los demás

---

*Codificado con la vibra de Cline y varias LLMs.* 🎯✨
