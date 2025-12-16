# Mejoras de UI/UX

Este documento detalla todas las mejoras de interfaz de usuario y experiencia identificadas para VoiceNotesAI.

---

## 1. Accesibilidad

### 1.1 Labels de Accesibilidad Faltantes

**Prioridad: Alta**

Actualmente solo `NoteDetailHeader.tsx` tiene `accessibilityLabel`. Todos los elementos interactivos necesitan labels.

#### Archivos a modificar:

**`src/features/recording/components/RecordButton.tsx`**
```tsx
// Agregar:
accessibilityLabel={isRecording ? "Detener grabación" : "Iniciar grabación de voz"}
accessibilityHint="Toca dos veces para alternar grabación"
accessibilityRole="button"
```

**`src/features/search/components/SearchBar.tsx`**
```tsx
// Agregar al TextInput:
accessibilityLabel="Buscar notas"
accessibilityHint="Escribe para buscar en transcripciones y títulos"
```

**`src/components/ui/NoteCard.tsx`**
```tsx
// Agregar al Pressable:
accessibilityLabel={`Nota del ${formatDate(note.createdAt)}, duración ${formatDuration(note.durationMs)}`}
accessibilityHint="Toca dos veces para ver transcripción y resumen"
accessibilityRole="button"
```

**`src/features/audio-playback/components/AudioPlayer.tsx`**
```tsx
// Agregar al botón play/pause:
accessibilityLabel={isPlaying ? "Pausar audio" : "Reproducir audio"}
accessibilityRole="button"

// Agregar al slider:
accessibilityLabel={`Posición de reproducción: ${formatTime(position)} de ${formatTime(duration)}`}
accessibilityRole="adjustable"
```

**`src/features/ai-assist/components/AIAssistSection.tsx`**
```tsx
// Agregar al botón generar:
accessibilityLabel="Generar resumen con inteligencia artificial"
accessibilityHint="Toca para crear resumen, puntos clave y sugerencia de título"
```

**`src/components/ui/StatusChip.tsx`**
```tsx
// Agregar:
accessibilityLabel={`Estado: ${status === 'done' ? 'completado' : status === 'pending' ? 'en proceso' : 'error'}`}
```

### 1.2 Contraste de Colores

**Prioridad: Baja**

**`src/constants/Colors.ts`**
- El color `textTertiary` (#999999) en modo claro está cerca del mínimo WCAG AA
- Considerar cambiar a #808080 para mejor legibilidad

---

## 2. Confirmaciones y Diálogos

### 2.1 Confirmación de Eliminación

**Prioridad: Crítica**

**Archivo:** `src/features/note-detail/components/NoteDetailHeader.tsx`

Actualmente el botón de eliminar borra sin confirmación. Implementar:

```tsx
import { Alert } from 'react-native';

const handleDeletePress = () => {
  Alert.alert(
    'Eliminar nota',
    '¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: onDelete
      },
    ]
  );
};
```

---

## 3. Sistema de Feedback (Toasts/Notificaciones)

### 3.1 Crear Componente Toast

**Prioridad: Alta**

**Nuevo archivo:** `src/components/feedback/Toast.tsx`

Notificaciones para:
- "Nota guardada correctamente"
- "Transcripción completada"
- "Resumen generado"
- "Error: [mensaje descriptivo]"
- "Sin conexión a internet"

**Nuevo archivo:** `src/contexts/ToastContext.tsx`

Provider para gestionar toasts globalmente.

**Modificar:** `app/_layout.tsx`

Agregar `ToastProvider` al root.

---

## 4. Estados de Carga

### 4.1 Skeleton Loaders

**Prioridad: Media**

**Nuevo archivo:** `src/components/feedback/NoteCardSkeleton.tsx`

Mostrar durante:
- Carga inicial de notas
- Mientras se completa transcripción
- Durante búsqueda

Implementar efecto shimmer animado.

### 4.2 Indicadores de Progreso

**Prioridad: Media**

**Archivo:** `src/features/ai-assist/components/AIAssistSection.tsx`

Agregar pasos de progreso:
1. "Analizando transcripción..."
2. "Generando resumen..."
3. "Extrayendo puntos clave..."

```tsx
const progressSteps = ['Analizando', 'Resumiendo', 'Extrayendo puntos'];
// Mostrar con animación de progress bar
```

---

## 5. Animaciones y Transiciones

### 5.1 Transiciones de Pantalla

**Prioridad: Baja**

**Archivo:** `app/_layout.tsx`

Configurar transiciones suaves entre:
- Lista de notas ↔ Detalle de nota
- Modal de grabación entrada/salida

### 5.2 Animación de Entrada del Overlay de Grabación

**Prioridad: Baja**

**Archivo:** `src/features/recording/components/RecordingOverlay.tsx`

Agregar:
- Fade in al aparecer
- Scale animation en botón de detener
- Slide up desde abajo

### 5.3 Micro-interacciones

**Prioridad: Baja**

**Archivos varios:**
- Animación de checkmark al completar transcripción
- Pulse animation en StatusChip "pending"
- Bounce en empty state icon

---

## 6. Empty States Mejorados

### 6.1 Estado Inicial

**Prioridad: Media**

**Archivo:** `src/features/notes-list/components/NotesEmptyState.tsx`

Mejoras:
- Animar el icono de micrófono
- Agregar onboarding para usuarios nuevos
- Mostrar ejemplo de flujo de grabación

### 6.2 Sin Resultados de Búsqueda

**Prioridad: Media**

**Archivo:** `src/components/ui/EmptyState.tsx`

Mostrar sugerencias:
- "Prueba con menos palabras"
- "Busca en títulos o transcripciones"

---

## 7. Haptic Feedback

### 7.1 Retroalimentación Táctil

**Prioridad: Baja**

**Dependencia:** `expo-haptics`

**Archivo:** `src/features/recording/components/RecordButton.tsx`

```tsx
import * as Haptics from 'expo-haptics';

// Al iniciar grabación:
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Al detener:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// En error:
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

---

## 8. Mejoras del Audio Player

### 8.1 Control de Velocidad

**Prioridad: Baja**

**Archivo:** `src/features/audio-playback/components/AudioPlayer.tsx`

Agregar selector de velocidad: 0.75x, 1x, 1.5x, 2x

### 8.2 Estado de Carga de Audio

**Prioridad: Media**

Mostrar spinner mientras el audio se carga antes de reproducir.

---

## Resumen de Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/features/recording/components/RecordButton.tsx` | Accesibilidad, haptics |
| `src/features/search/components/SearchBar.tsx` | Accesibilidad |
| `src/components/ui/NoteCard.tsx` | Accesibilidad |
| `src/features/audio-playback/components/AudioPlayer.tsx` | Accesibilidad, velocidad |
| `src/features/ai-assist/components/AIAssistSection.tsx` | Accesibilidad, progreso |
| `src/components/ui/StatusChip.tsx` | Accesibilidad, animación |
| `src/features/note-detail/components/NoteDetailHeader.tsx` | Confirmación eliminar |
| `src/features/recording/components/RecordingOverlay.tsx` | Animaciones |
| `src/components/ui/EmptyState.tsx` | Mejoras visuales |
| `src/constants/Colors.ts` | Ajuste contraste |
| `app/_layout.tsx` | ToastProvider, transiciones |

## Nuevos Archivos a Crear

| Archivo | Propósito |
|---------|-----------|
| `src/components/feedback/Toast.tsx` | Componente de notificación |
| `src/contexts/ToastContext.tsx` | Provider global de toasts |
| `src/components/feedback/NoteCardSkeleton.tsx` | Skeleton loader |
