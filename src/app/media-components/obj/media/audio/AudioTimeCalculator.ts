import {AudioChunk} from './AudioChunk';
import {BrowserAudioTime} from './AudioTime';

export class AudioTimeCalculator {
  set duration(value: BrowserAudioTime) {
    this._duration = value;
  }

  constructor(public samplerate: number,
              public _duration: BrowserAudioTime,
              public audio_px_width: number) {
    if (this.audio_px_width === null || this.audio_px_width < 1) {
      console.error('audio px null');
    }
  }

  public static roundSamples(samples: number) {
    return Math.round(samples);
  }

  public samplestoAbsX(time_samples: number, duration?: BrowserAudioTime): number {
    const dur = (duration) ? duration : this._duration;

    if (dur.browserSample.value === 0) {
      throw new Error('time duration must have samples greater 0');
    }

    return (time_samples / dur.browserSample.value) * this.audio_px_width;
  }

  public absXChunktoSamples(absX: number, chunk: AudioChunk): number {
    const start = (chunk.time.start) ? chunk.time.start.browserSample.value : 1;
    const duration = chunk.time.end.browserSample.value - start;
    if (absX >= 0 && absX <= this.audio_px_width) {
      const ratio = absX / this.audio_px_width;
      return AudioTimeCalculator.roundSamples((duration * ratio) + chunk.time.start.browserSample.value);
    }

    return -1;
  }

  public absXtoSamples2(absX: number, chunk: AudioChunk): number {
    const start = (chunk.time.start) ? chunk.time.start.browserSample.value : 1;
    const duration = chunk.time.end.browserSample.value - start;
    if (absX >= 0 && absX <= this.audio_px_width) {
      const ratio = absX / this.audio_px_width;

      return AudioTimeCalculator.roundSamples(duration * ratio);
    }

    return -1;
  }

  public samplesToSeconds(samples: number): number {
    return (this.samplerate > 0 && samples > -1) ? (samples / this.samplerate) : 0;
  }

  public secondsToSamples(seconds: number): number {
    return (this.samplerate > 0 && seconds > -1) ? AudioTimeCalculator.roundSamples(seconds * this.samplerate) : 0;
  }
}
