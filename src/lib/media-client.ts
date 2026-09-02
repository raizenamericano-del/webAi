/** Helper konversi audio di sisi browser (Web Audio + lamejs). */

export function bufferToWavUrl(buffer: AudioBuffer) {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const view = new DataView(ab);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + len, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, len, true);

  let offset = 44;
  const chans = [];
  for (let i = 0; i < numCh; i++) chans.push(buffer.getChannelData(i));
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return URL.createObjectURL(new Blob([ab], { type: "audio/wav" }));
}

export async function audioBufferToMp3Url(buffer: AudioBuffer) {
  // @ts-ignore
  const mod: any = await import("lamejs");
  const lamejs = mod.default || mod;
  const Mp3Encoder = lamejs.Mp3Encoder || (lamejs.default && lamejs.default.Mp3Encoder);
  const encoder = new Mp3Encoder(buffer.numberOfChannels, buffer.sampleRate, 192);
  const blockSize = 1152;
  const samples: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) samples.push(buffer.getChannelData(c));
  const mp3Data: Uint8Array[] = [];
  const left = new Int16Array(blockSize);
  const right = buffer.numberOfChannels > 1 ? new Int16Array(blockSize) : null;
  for (let i = 0; i < buffer.length; i += blockSize) {
    const size = Math.min(blockSize, buffer.length - i);
    for (let j = 0; j < size; j++) {
      left[j] = samples[0][i + j] * 0x7fff;
      if (right) right[j] = samples[1][i + j] * 0x7fff;
    }
    const buf = right
      ? encoder.encodeBuffer(left.subarray(0, size), right.subarray(0, size))
      : encoder.encodeBuffer(left.subarray(0, size));
    if (buf.length > 0) mp3Data.push(new Uint8Array(buf));
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(new Uint8Array(end));
  const blob = new Blob(mp3Data as any, { type: "audio/mp3" });
  return URL.createObjectURL(blob);
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx.decodeAudioData(await file.arrayBuffer());
}

export function downloadBlobUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
