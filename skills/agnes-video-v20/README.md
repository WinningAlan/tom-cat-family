
# Guía de integración de la API Agnes-Video-V2.0

## Descripción general
Agnes-Video-V2.0 es un modelo de generación de video orientado a entornos de producción. Admite flujos de trabajo de Text-to-Video, Image-to-Video, Multi-Image Video Generation y Keyframe Animation.
Los desarrolladores pueden generar videos de alta calidad a partir de prompts de texto, URL de imágenes o varias imágenes de referencia. El modelo es adecuado para storytelling, videos de marketing, demostraciones de productos, contenido para redes sociales, recursos animados para apps y flujos de trabajo creativos con IA.
Agnes-Video-V2.0 utiliza una API basada en tareas asíncronas. Primero debes crear una tarea de generación de video y, después, consultar el resultado usando el video_id o task_id devuelto.

## Capacidades compatibles

## Casos de uso

## Requisitos previos
Antes de integrar la API, asegúrate de tener:
1. Una Agnes AI API Key válida.
1. Acceso de red al Agnes AI API Gateway.
1. El nombre del modelo confirmado: agnes-video-v2.0.
1. Un prompt de texto preparado para la generación de video.
1. URL de imágenes accesibles públicamente si utilizas Image-to-Video, Multi-Image Video o Keyframe Animation.

## API Endpoints
Después de crear una tarea de video, la respuesta incluirá un video_id.
Se recomienda usar video_id para consultar el resultado del video.
El endpoint anterior de consulta por tarea sigue estando disponible para mantener compatibilidad con integraciones existentes.

## Parámetros de la solicitud

## Crear tarea de video
Usa esta solicitud para generar un video directamente desde un prompt de texto.

```
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic shot of a cat walking on the beach at sunset, soft ocean waves, warm golden lighting, realistic motion",
    "height": 768,
    "width": 1152,
    "num_frames": 121,
    "frame_rate": 24
  }'
```
Usa esta solicitud para animar una sola imagen.

```
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "The woman slowly turns around and looks back at the camera, natural facial expression, cinematic camera movement",
    "image": "https://example.com/image.png",
    "num_frames": 121,
    "frame_rate": 24
  }'
```
Usa esta solicitud para generar un video guiado por varias imágenes de entrada.

```
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "Create a smooth transformation scene between the two reference images, cinematic lighting, consistent character identity, natural motion",
    "extra_body": {
      "image": [
        "https://example.com/image1.png",
        "https://example.com/image2.png"
      ]
    },
    "num_frames": 121,
    "frame_rate": 24
  }'
```
Usa esta solicitud para generar una animación fluida entre varios keyframes.

```
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "Generate a smooth cinematic transition between the keyframes, maintaining visual consistency and natural camera movement",
    "extra_body": {
      "image": [
        "https://example.com/keyframe1.png",
        "https://example.com/keyframe2.png"
      ],
      "mode": "keyframes"
    },
    "num_frames": 121,
    "frame_rate": 24
  }'
```

## Respuesta al crear la tarea
Después de crear correctamente la tarea de video, la API devuelve la información de la tarea.
La respuesta incluye tanto task_id como video_id.
video_id es el ID recomendado para consultar el resultado del video.

```
{
  "id": "task_YOUR_TASK_ID",
  "task_id": "task_YOUR_TASK_ID",
  "video_id": "video_YOUR_VIDEO_ID",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "queued",
  "progress": 0,
  "created_at": 1780457477,
  "seconds": "10.0",
  "size": "1280x768"
}
```

## Consultar resultado de video
Después de crear una tarea de video, usa el video_id devuelto para consultar el resultado.

```
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>' \
  --header 'Authorization: Bearer <API_KEY>'
```
Ejemplo:

```
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=video_xxxxxx' \
  --header 'Authorization: Bearer <API_KEY>'
```
Al consultar el resultado del video, también puedes pasar model_name para especificar explícitamente el nombre del modelo.

```
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>&model_name=<MODEL>' \
  --header 'Authorization: Bearer <API_KEY>'
```
Ejemplo:

```
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=video_xxxxxx&model_name=agnes-video-v2.0' \
  --header 'Authorization: Bearer <API_KEY>'
```
Se recomienda usar model_name en los siguientes casos:
1. Estás usando un upstream raw video ID.
1. El modelo utilizado no es el modelo predeterminado agnes-video-v2.0.
1. Quieres especificar explícitamente el modelo usado para consultar el resultado.
Cuando se proporciona model_name, este parámetro tiene prioridad.
Para mantener compatibilidad con versiones anteriores, todavía puedes usar task_id para consultar el resultado del video.

```
curl --location --request GET 'https://apihub.agnes-ai.com/v1/videos/<TASK_ID>' \
  --header 'Authorization: Bearer <API_KEY>'
```
Ejemplo:

```
curl --location --request GET 'https://apihub.agnes-ai.com/v1/videos/task_xxxxxx' \
  --header 'Authorization: Bearer <API_KEY>'
```
Este método sigue siendo compatible, pero las nuevas integraciones deberían usar el método de consulta con video_id.

## Respuesta del resultado
Cuando la tarea se completa, la API devuelve el resultado final del video.

```
{
  "id": "task_YOUR_TASK_ID",
  "video_id": "video_YOUR_VIDEO_ID",
  "model": "agnes-video-v2.0",
  "object": "video",
  "status": "completed",
  "progress": 100,
  "seconds": "10.0",
  "size": "1280x768",
  "remixed_from_video_id": "https://storage.googleapis.com/agnes-aigc/aigc/videos/2026/06/03/video_xxxxxx.mp4",
  "error": null
}
```

## Estados de la tarea

## Control de duración del video
Agnes-Video-V2.0 permite controlar la duración del video mediante num_frames y frame_rate.
Fórmula:

```
seconds = num_frames / frame_rate
```
Donde:
- num_frames es el número total de fotogramas generados;
- frame_rate es la tasa de fotogramas del video, es decir, cuántos fotogramas se reproducen por segundo;
- num_frames debe ser menor o igual que 441;
- num_frames debe cumplir la regla 8n + 1;
- frame_rate admite valores de 1 a 60.
Para generar un video más largo, aumenta num_frames o reduce frame_rate.
Para lograr un movimiento más fluido, usa un frame_rate más alto, como 24 o 30. Sin embargo, con el mismo num_frames, un frame_rate más alto producirá un video más corto.

## Parámetros recomendados

## Buenas prácticas para prompts
Para tareas de text-to-video, se recomienda describir el sujeto, la acción, la escena, el movimiento de cámara, la iluminación y el estilo visual.
Estructura recomendada:

```
[Subject] + [Action] + [Scene] + [Camera Movement] + [Lighting] + [Style]
```
Ejemplo:

```
A young astronaut walking across a red desert planet, dust blowing in the wind, slow cinematic tracking shot, dramatic sunset lighting, realistic sci-fi style
```
Para tareas de image-to-video, describe qué elementos deben moverse y qué elementos principales deben mantenerse estables.
Ejemplo:

```
Animate the character with subtle breathing motion, hair moving gently in the wind, background lights flickering softly, while keeping the face and outfit consistent
```
Para tareas de multi-image video, describe la relación entre las imágenes de entrada y cómo debe realizarse la transición de la escena.
Ejemplo:

```
Use the first image as the starting scene and the second image as the target scene. Create a smooth transformation with consistent lighting, natural motion, and cinematic pacing
```
Para tareas de keyframe animation, describe claramente la relación de transición entre los keyframes.
Ejemplo:

```
Create a smooth transition from the first keyframe to the second keyframe, maintaining character identity, consistent camera angle, and natural motion between scenes
```

## Códigos de error

## Precio

## Notas
- Usa agnes-video-v2.0 como nombre del modelo.
- La generación de video es asíncrona.
- Debes crear primero una tarea de video y después consultar el resultado.
- La respuesta de creación de tarea devuelve tanto task_id como video_id.
- Las nuevas integraciones deberían usar video_id para consultar los resultados.
- El endpoint anterior de consulta por task_id sigue estando disponible.
- video_url solo está disponible cuando status es completed.
- num_frames debe ser menor o igual que 441.
- num_frames debe cumplir la regla 8n + 1, por ejemplo 81, 121, 161, 241 o 441.
- Las tareas Text-to-Video solo requieren model y prompt.
- Las tareas Image-to-Video requieren una URL de imagen mediante image.
- Las tareas Multi-Image Video requieren varias URL de imágenes en extra_body.image.
- Keyframe Animation requiere establecer extra_body.mode como keyframes.
