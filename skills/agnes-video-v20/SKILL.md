---
name: agnes-video-v20
description: Generate videos from a script plus reference images using Agnes Video V2.0 (agnes-video-v2.0). Supports single-image animation, multi-image story video, keyframe animation, and text-to-video.
---

## What this skill does

Use this skill when the user wants to turn:
- a script / storyboard / shot list, AND
- one or more reference images

into generated videos through the Agnes Video V2.0 API.

The default recommended flow is:
1. read the user's script/storyboard
2. map each scene/shot to image inputs
3. choose `image`, `extra_body.image`, or `extra_body.mode = keyframes` based on the scene type
4. submit async video creation requests
5. poll `video_id`
6. return completed `video_url` / download URLs

## Source of truth

Official API examples and behavior are documented at:
- `https://agnes-ai.com/doc/agnes-video-v20`

Use the extracted working notes in this skill directory when present:
- `README.md`

## Required environment

- API key: set `AGNES_API_KEY`
- Base API host: `https://apihub.agnes-ai.com`
- Default model: `agnes-video-v2.0`

### Key endpoints

Create video task:
- `POST /v1/videos`

Query result by video id:
- `GET /agnesapi?video_id=<VIDEO_ID>`
- optional: `&model_name=agnes-video-v2.0`

Fallback legacy task query:
- `GET /v1/videos/<TASK_ID>`

## Input contract

Accept one of these user inputs:
- a Markdown script with numbered scenes, OR
- a JSON storyboard, OR
- a directory that contains:
  - `script.md` or `storyboard.json`
  - image files or an `images/` folder

### Minimum scene data

For each scene, extract:
- scene id / shot number
- narration / prompt
- attached image path(s) or public URL(s)
- optional motion hint
- optional duration hint

## Mode selection rules

Use these rules:

### Single image animation
Use when a scene has exactly one local/remote image and the task is to animate it.
Request shape:
- `prompt`
- `image` = single public URL

### Multi-image story video
Use when a scene has 2+ images and the intent is transformation/transition between them.
Request shape:
- `prompt`
- `extra_body.image` = array of public URLs

### Keyframe animation
Use when the user explicitly says keyframes, or frames are meant to be honored in order.
Request shape:
- `prompt`
- `extra_body.image` = array of public URLs
- `extra_body.mode = "keyframes"`

### Text-to-video
Use only when no image is attached and the user explicitly wants text-only generation.

## Image requirements

- API requires publicly accessible URLs.
- If the user provides local files, upload/host them first and return URLs before calling Agnes.
- If no upload mechanism is available, tell the user that local paths must be converted to public URLs.

## Prompt template

Prefer this English structure unless the user forces another language:
- `[Subject] + [Action] + [Scene] + [Camera Movement] + [Lighting] + [Style]`

For image-to-video, add:
- what should move
- what should stay stable

For multi-image:
- describe how the scene transforms from first image toward later images

For keyframe:
- describe transition intent between keyframes

## Request template

### Create task

```
POST https://apihub.agnes-ai.com/v1/videos
Authorization: Bearer $AGNES_API_KEY
Content-Type: application/json
```

Body for image scene:
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "<scene prompt>",
  "image": "<public image url>",
  "num_frames": 121,
  "frame_rate": 24
}
```

Body for multi-image scene:
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "<scene prompt>",
  "extra_body": {
    "image": ["<url1>", "<url2>"]
  },
  "num_frames": 121,
  "frame_rate": 24
}
```

Body for keyframe scene:
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "<scene prompt>",
  "extra_body": {
    "image": ["<url1>", "<url2>"],
    "mode": "keyframes"
  },
  "num_frames": 121,
  "frame_rate": 24
}
```

### Poll task

```
GET https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>&model_name=agnes-video-v2.0
Authorization: Bearer $AGNES_API_KEY
```

## Response handling

After creation, expect fields like:
- `task_id`
- `video_id`
- `status`
- `progress`

After completion, expect fields like:
- `status = completed`
- `progress = 100`
- `video_url` / downloadable result link

Only treat a scene as finished when the API returns completed status and a real downloadable URL.

## Duration control

Use this formula:
- `seconds = num_frames / frame_rate`

Constraints from docs:
- `num_frames <= 441`
- `num_frames` should match `8n + 1`, e.g. `81, 121, 161, 241, 441`
- `frame_rate` supports `1..60`

### Default policy

Unless the user specifies otherwise:
- single image scene: `num_frames = 121`, `frame_rate = 24`
- longer narrative scenes: `num_frames = 241`, `frame_rate = 24`

## Output format

Return a scene-by-scene report:
- scene id
- prompt used
- mode used (`image` / `multi-image` / `keyframes` / `text`)
- API response summary
- final video URL or download path
- any failures / retries

If multiple scenes succeed, also return:
- a playlist-like ordered list
- total combined duration estimate

## Recommended workflow for script + images

1. Parse script into ordered scenes.
2. Match each scene to image assets by filename, scene number, or user mapping.
3. Normalize prompts.
4. Choose generation mode.
5. Submit all scenes.
6. Poll until all finish or until timeout.
7. Collect outputs.
8. Return final video list and metadata.

## Guardrails

- Do not invent undocumented parameters.
- Do not claim a video is complete before the API reports completed.
- Do not use local file paths in API `image` fields.
- Do not hardcode the user's private API key into generated files unless explicitly requested.
- If a scene has no public image URL available, stop and ask the user to provide hosted URLs or an upload method.

## Example user intents to trigger this skill

- "根据这个剧本和这些图片生成视频"
- "把这组分镜图片做成视频"
- "用这几张图做 image-to-video / keyframe 动画"
- "按脚本里的镜头顺序调用 agnes-video-v2.0 出片"

## Success criteria

- each scene is mapped to the correct mode
- requests match Agnes Video V2.0 contract
- outputs include real completed video URLs
- failures are reported per scene with reason
