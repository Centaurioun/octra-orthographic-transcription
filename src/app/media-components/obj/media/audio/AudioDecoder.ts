import {AudioFormat, WavFormat} from './AudioFormats';
import {Subject} from 'rxjs';
import {AudioInfo} from './AudioInfo';
import {OriginalSample} from './AudioTime';

declare var window: any;

export class AudioDecoder {
  public onaudiodecode: Subject<{
    progress: number,
    result: AudioBuffer
  }> = new Subject<{
    progress: number,
    result: AudioBuffer
  }>();

  private audioInfo: AudioInfo;
  private format: AudioFormat;
  private audioBuffer: AudioBuffer;
  private audioContext: AudioContext;
  private arrayBuffer: ArrayBuffer;

  private stopDecoding = false;

  constructor(format: AudioFormat, arrayBuffer: ArrayBuffer) {
    if (!(format === null || format === undefined)) {
      this.audioInfo = format.getAudioInfo('file.wav', 'audio/wav', arrayBuffer);
      this.format = format;
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.arrayBuffer = arrayBuffer;
    } else {
      throw new Error('format is null or undefined');
    }
  }

  decodeChunked(sampleStart: number, sampleDur: number) {
    if (this.format instanceof WavFormat) {
      console.log(`decode from sample ${sampleStart} to ${sampleStart + sampleDur}`);
      // cut the audio file into 10 parts:
      const partSamples = this.createOriginalSample(
        sampleDur
      );

      const startSamples = this.createOriginalSample(
        sampleStart
      );

      if (sampleStart === 0) {
        this.stopDecoding = false;
      }

      if (sampleStart + sampleDur <= this.audioInfo.duration.originalSample.value && sampleStart >= 0 && sampleDur >= sampleDur) {

        /*
        this.decodeAudioFile(this.arrayBuffer).then((audiobuffer) => {
          console.log(`audiobuffer samples: ${audiobuffer.length}, ${audiobuffer.duration}`);
          this.onaudiodecode.next({
            progress: 1,
            result: audiobuffer
          });
        }).catch((error) => {
          console.error(error);
        });*/
        this.format.getAudioCutAsArrayBuffer(this.arrayBuffer, {
          number: 0,
          sampleStart: startSamples,
          sampleDur: partSamples
        }).then((dataPart: ArrayBuffer) => {
          console.log(`cutted start ${startSamples.value} with dur ${partSamples.value}`);
          this.decodeAudioFile(dataPart).then((audioBuffer: AudioBuffer) => {
            console.log(`audiobuffer duration is ${audioBuffer.length}`);
            // console.log(`decoded part duration: ${audioBuffer.duration} (diff: ${audioBuffer.duration - partSamples.seconds}) (browser samplerate = ${this.audioInfo.duration.sampleRates.browser}`);

            if (audioBuffer.duration - partSamples.seconds !== 0) {
              console.error(`diff of audio durations is ${audioBuffer.duration - partSamples.seconds} = ${(partSamples.seconds - audioBuffer.duration) * partSamples.sampleRate} samples! (sample rate = ${partSamples.sampleRate})`);
              console.log(`${audioBuffer.length - Math.round(partSamples.seconds * audioBuffer.sampleRate)}`);
            }

            if (!(this.audioBuffer === null || this.audioBuffer === undefined)) {
              this.audioBuffer = this.appendAudioBuffer(this.audioBuffer, audioBuffer);
            } else {
              this.audioBuffer = audioBuffer;
            }


            if (sampleStart + sampleDur === this.audioInfo.duration.originalSample.value) {
              // send complete audiobuffer
              console.log(`final audiobuffer duration is ${this.audioBuffer.length}`);
              this.onaudiodecode.next({
                progress: 1,
                result: this.audioBuffer
              });
              this.onaudiodecode.complete();
            } else {
              const progress = (sampleStart + sampleDur) / this.audioInfo.duration.originalSample.value;
              console.log(`${Math.round(progress * 100)}%`);
              this.onaudiodecode.next({
                progress,
                result: null
              });

              if (!this.stopDecoding) {
                setTimeout(() => {
                  let sampleDur2 = Math.min(sampleDur, this.audioInfo.duration.originalSample.value - sampleStart - sampleDur);

                  if (this.audioInfo.duration.originalSample.value - sampleStart - sampleDur < 2 * sampleDur) {
                    sampleDur2 = this.audioInfo.duration.originalSample.value - sampleStart - sampleDur;

                    const diff = sampleStart + sampleDur + sampleDur2 - this.audioInfo.duration.originalSample.value;
                    console.log(`last segment! decode from ${sampleStart + sampleDur} to ${sampleStart + sampleDur + sampleDur2} (${diff})`);
                  }
                  this.decodeChunked(sampleStart + sampleDur, sampleDur2);
                }, 0);
              } else {
                console.log(`decoding stopped!`);
                this.onaudiodecode.complete();
              }
              this.stopDecoding = false;
            }

          }).catch((error2) => {
            console.error(error2);
          });
        }).catch((error3) => {
          this.onaudiodecode.error(error3);
        });
      } else {
        console.error(`can not decode part because samples are not correct`);
      }
    } else {
      console.log(`not instance of WavFormat`);
      this.decodeAudioFile(this.arrayBuffer).then((result) => {
        this.onaudiodecode.next({
          progress: 1,
          result
        });
      }).catch((error4) => {
        this.onaudiodecode.error(error4);
      });
    }
  }

  public decodePartOfAudioFile: (segment: SegmentToDecode) => Promise<AudioBuffer> = (segment) => {
    return new Promise<AudioBuffer>((resolve, reject) => {
      if (!(segment === null || segment === undefined)) {
        if (segment.sampleStart.equalSampleRate(segment.sampleDur)) {
          const sampleStart = segment.sampleStart.value;
          const sampleDur = Math.min(this.audioInfo.duration.originalSample.value - sampleStart, segment.sampleDur.value);

          if (sampleStart >= 0 && sampleStart + sampleDur <= this.audioInfo.duration.originalSample.value
            && sampleDur > 0) {
            (this.format as WavFormat).getAudioCutAsArrayBuffer(this.arrayBuffer, segment)
              .then((arrayBuffer: ArrayBuffer) => {
                this.decodeAudioFile(arrayBuffer).then((audioBuffer: AudioBuffer) => {
                  resolve(audioBuffer);
                }).catch((error) => {
                  reject(error);
                });
              }).catch((error) => {
              reject(error);
            });
          } else {
            console.error(segment);
            reject(new Error('values of segment are invalid'));
          }
        } else {
          reject(new Error('sample rates of sampleStart and sampleDur do not match.'));
        }
      } else {
        console.error(`segment is null or undefined`);
      }
    });
  }

  /**
   * decodes the audio file and keeps its samplerate using OfflineAudioContext
   */
  private decodeAudioFile(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise<AudioBuffer>((resolve, reject) => {
      if (!(arrayBuffer === null || arrayBuffer === undefined)) {
        this.audioContext.decodeAudioData(arrayBuffer).then((audiobuffer: AudioBuffer) => {
          console.log(`decoded audiobuffer samplerate is ${audiobuffer.sampleRate}`);
          resolve(audiobuffer);
        }).catch((error) => {
          reject(error);
        });
      } else {
        reject(new Error('arrayBuffer is null or undefined'));
      }
    });
  }

  public appendAudioBuffer(oldBuffer: AudioBuffer, newBuffer: AudioBuffer) {
    const tmp = this.audioContext.createBuffer(this.audioInfo.channels,
      (oldBuffer.length + newBuffer.length), oldBuffer.sampleRate);

    console.log(`append audio buffers with sample rate ${oldBuffer.sampleRate}`);
    for (let i = 0; i < this.audioInfo.channels; i++) {
      const channel = tmp.getChannelData(i);
      channel.set(oldBuffer.getChannelData(i), 0);
      channel.set(newBuffer.getChannelData(i), oldBuffer.length);
    }
    return tmp;
  }

  public createOriginalSample(sample: number): OriginalSample {
    console.log(`create origin sample with samplerate ${this.audioInfo.samplerate}`);
    return new OriginalSample(sample, this.audioInfo.samplerate);
  }

  public requeststopDecoding() {
    this.stopDecoding = true;
  }
}

export interface SegmentToDecode {
  number: number;
  sampleStart: OriginalSample;
  sampleDur: OriginalSample;
}
