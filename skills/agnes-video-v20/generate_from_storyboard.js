#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const API_HOST = 'https://apihub.agnes-ai.com';
const MODEL = 'agnes-video-v2.0';
const DEFAULT_FRAMES = 121;
const DEFAULT_FPS = 24;
const POLL_INTERVAL_MS = 5000;
const TIMEOUT_MS = 1000 * 60 * 20;

function parseArgs(argv) {
  const args = { storyboard: undefined, outputDir: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      args.help = true;
    } else if ((a === '--storyboard' || a === '-s') && argv[i + 1]) {
      args.storyboard = argv[++i];
    } else if ((a === '--output' || a === '-o') && argv[i + 1]) {
      args.outputDir = argv[++i];
    } else if (!a.startsWith('-') && !args.storyboard) {
      args.storyboard = a;
    }
  }
  if (!args.outputDir) args.outputDir = 'output';
  return args;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function assertPublicUrl(value, field) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
    throw new Error(`${field} must be a public http(s) URL, got: ${String(value)}`);
  }
}

function inferMode(scene) {
  if (scene.mode) return scene.mode;
  if (Array.isArray(scene.images) && scene.images.length >= 2) return 'multi-image';
  if (scene.image) return 'image';
  return 'text';
}

function buildRequestBody(scene, defaults) {
  const mode = inferMode(scene);
  const numFrames = scene.num_frames ?? defaults.default_num_frames ?? DEFAULT_FRAMES;
  const frameRate = scene.frame_rate ?? defaults.default_frame_rate ?? DEFAULT_FPS;
  if (!Number.isInteger(numFrames) || numFrames < 1 || numFrames > 441) {
    throw new Error(`scene ${scene.scene_id}: num_frames must be 1..441`);
  }
  if (!Number.isInteger(frameRate) || frameRate < 1 || frameRate > 60) {
    throw new Error(`scene ${scene.scene_id}: frame_rate must be 1..60`);
  }

  const base = {
    model: MODEL,
    prompt: String(scene.prompt ?? '').trim(),
    num_frames: numFrames,
    frame_rate: frameRate,
  };

  if (!base.prompt) throw new Error(`scene ${scene.scene_id}: prompt is required`);
  if (scene.width) base.width = scene.width;
  if (scene.height) base.height = scene.height;

  if (mode === 'image') {
    assertPublicUrl(scene.image, 'image');
    base.image = scene.image;
    return { mode, body: base };
  }

  if (mode === 'multi-image') {
    const images = Array.isArray(scene.images) ? scene.images : [];
    images.forEach((u, idx) => assertPublicUrl(u, `images[${idx}]`));
    if (images.length < 2) throw new Error(`scene ${scene.scene_id}: multi-image requires >= 2 images`);
    base.extra_body = { image: images };
    return { mode, body: base };
  }

  if (mode === 'keyframes') {
    const images = Array.isArray(scene.images) ? scene.images : [];
    images.forEach((u, idx) => assertPublicUrl(u, `images[${idx}]`));
    if (images.length < 2) throw new Error(`scene ${scene.scene_id}: keyframes requires >= 2 images`);
    base.extra_body = { image: images, mode: 'keyframes' };
    return { mode, body: base };
  }

  if (mode === 'text') {
    return { mode, body: base };
  }

  throw new Error(`scene ${scene.scene_id}: unsupported mode ${mode}`);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 500)}`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return json;
}

async function createTask(apiKey, body) {
  return fetchJson(`${API_HOST}/v1/videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function pollVideo(apiKey, videoId) {
  const started = Date.now();
  const targetUrl = `${API_HOST}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(MODEL)}`;
  while (Date.now() - started < TIMEOUT_MS) {
    const json = await fetchJson(targetUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const status = json.status;
    if (status === 'completed') return json;
    if (status === 'failed' || status === 'cancelled' || status === 'error') {
      throw new Error(`Video ${videoId} ended with status=${status}: ${JSON.stringify(json.error ?? json).slice(0, 500)}`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Timeout waiting for video_id=${videoId}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

async function main() {
  const args = parseArgs(process.argv);
  const apiKey = requiredEnv('AGNES_API_KEY');
  if (args.help) {
    console.log(`Usage: node skills/agnes-video-v20/generate_from_storyboard.js --storyboard <path> [--output <dir>]\n\nOptions:\n  -s, --storyboard   Path to storyboard JSON (required)\n  -o, --output       Output directory (default: output)\n  -h, --help         Show help\n`);
    return;
  }
  if (!args.storyboard) throw new Error('Missing required --storyboard <path>');
  const storyboardPath = path.resolve(args.storyboard);
  const storyboardRaw = await fs.readFile(storyboardPath, 'utf-8');
  const storyboard = JSON.parse(storyboardRaw);
  if (!Array.isArray(storyboard.scenes) || storyboard.scenes.length === 0) {
    throw new Error('storyboard must contain a non-empty scenes array');
  }

  const outputDir = path.resolve(args.outputDir);
  await ensureDir(outputDir);

  const results = [];
  for (const scene of storyboard.scenes) {
    const sceneId = scene.scene_id ?? `scene-${results.length + 1}`;
    const { mode, body } = buildRequestBody(scene, storyboard);

    const createJson = await createTask(apiKey, body);
    const videoId = createJson.video_id ?? createJson.id;
    if (!videoId) throw new Error(`scene ${sceneId}: missing video id in creation response`);

    const finalJson = await pollVideo(apiKey, videoId);
    const videoUrl = finalJson.video_url ?? finalJson.remixed_from_video_id ?? null;

    const sceneResult = {
      scene_id: sceneId,
      mode,
      prompt: body.prompt,
      request_summary: {
        image: body.image ?? null,
        extra_body: body.extra_body ?? null,
        num_frames: body.num_frames,
        frame_rate: body.frame_rate,
      },
      create_response: createJson,
      poll_response: finalJson,
      video_url: videoUrl,
    };

    if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
      try {
        const ext = videoUrl.includes('.mp4') ? '.mp4' : '.video';
        const outFile = path.join(outputDir, `${sceneId}${ext}`);
        await downloadToFile(videoUrl, outFile);
        sceneResult.local_path = outFile;
      } catch (downloadErr) {
        sceneResult.download_error = String(downloadErr?.message ?? downloadErr);
      }
    }

    results.push(sceneResult);
    await sleep(200);
  }

  const report = {
    model: MODEL,
    storyboard: path.relative(process.cwd(), storyboardPath),
    output_dir: path.relative(process.cwd(), outputDir),
    scenes: results,
  };

  const reportPath = path.join(outputDir, 'report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
