import {AudioInfo} from './audio-info';
import {SampleUnit} from './audio-time';
import {SubscriptionManager, TsWorker, TsWorkerJob, TsWorkerStatus} from '@octra/utilities';
import {AudioFormat, IntArray, WavFormat} from './AudioFormats';
import {Subject, timer} from 'rxjs';

declare let window: unknown;

export class AudioDecoder {
  public onChannelDataCalculate: Subject<{
    progress: number,
    result?: Float32Array
  }> = new Subject<{
    progress: number,
    result?: Float32Array
  }>();
  public started = 0;
  private audioInfo: AudioInfo;
  private readonly format: AudioFormat;
  private channelData?: Float32Array;
  private channelDataOffset = 0;
  private audioContext: AudioContext;
  private tsWorkers: TsWorker[];
  private nextWorker = 0;
  private parallelJobs = 2;
  private joblist: {
    jobId: number,
    start: number,
    duration: number
  }[] = [];
  private subscrmanager = new SubscriptionManager();

  private stopDecoding = false;
  private uint8Array?: Uint8Array;
  private writtenChannel = 0;
  private afterChannelDataFinished?: Subject<void>;

  get channelDataFactor() {
    let factor: number;
    if (this.audioInfo.sampleRate === 48000) {
      factor = 3;
      // sampleRate = 16000
    } else if (this.audioInfo.sampleRate === 44100) {
      factor = 2;
    } else {
      // sampleRate = 22050
      factor = 1;
    }
    return factor;
  }

  constructor(format: AudioFormat, audioInfo: AudioInfo, arrayBuffer: ArrayBuffer) {
    if (!(format === undefined || format === undefined)) {
      this.format = format;
      this.audioInfo = audioInfo;
      this.uint8Array = new Uint8Array(arrayBuffer);
      this.audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      this.tsWorkers = [];

      for (let i = 0; i < this.parallelJobs; i++) {
        const worker = new TsWorker();
        worker.jobstatuschange.subscribe((job: TsWorkerJob) => {
          const jobItem = this.joblist.findIndex((a) => {
            return a.jobId === job.id;
          });

          if (job.status === TsWorkerStatus.FINISHED && job.result !== undefined) {
            if (jobItem > -1) {
              const j = this.joblist[jobItem];
              this.writtenChannel += j.duration;
              this.joblist.splice(jobItem, 1);

              if (this.channelData === undefined || this.channelData === undefined) {
                this.channelData = new Float32Array(Math.round(this.audioInfo.duration.samples / this.channelDataFactor));
              }

              this.minimizeChannelData([job.result, this.channelDataFactor]).then((result) => {
                this.insertChannelBuffer(Math.floor(j.start / this.channelDataFactor), result);
              })
                .catch((error) => {
                  console.error(error);
                });
            }
          }

          if (this.writtenChannel >= this.audioInfo.duration.samples - 1) {
            // send complete audiobuffer
            this.onChannelDataCalculate.next({
              progress: 1,
              result: this.channelData
            });

            this.afterChannelDataFinished!.next();
          } else {
            const progress = this.writtenChannel / (this.audioInfo.duration.samples);
            this.onChannelDataCalculate.next({
              progress,
              result: undefined
            });
          }
        });

        this.tsWorkers.push(worker);
      }

    } else {
      throw new Error('format is undefined or undefined');
    }
  }

  getChunkedChannelData(sampleStart: SampleUnit, sampleDur: SampleUnit): Promise<Float32Array> {
    return new Promise<Float32Array>((resolve, reject) => {
      if (this.format instanceof WavFormat) {
        // cut the audio file into 10 parts:
        if (sampleStart.samples === 0) {
          this.stopDecoding = false;
        }

        if (sampleStart.samples + sampleDur.samples <= this.audioInfo.duration.samples
          && sampleStart.samples >= 0) {

          if (this.afterChannelDataFinished === undefined) {
            this.afterChannelDataFinished = new Subject<void>();
            this.afterChannelDataFinished.subscribe(() => {
              this.afterChannelDataFinished!.unsubscribe();
              this.afterChannelDataFinished = undefined;
              resolve(this.channelData!);
              this.onChannelDataCalculate.complete();
            });
          }

          if (sampleStart.samples === 0 && sampleDur.samples === this.audioInfo.duration.samples) {
            this.format.extractDataFromArray(sampleStart.samples, sampleDur.samples, this.uint8Array!, 0)
              .then((data: IntArray) => {
                this.getChannelData([data, sampleDur.samples, this.format.bitsPerSample]).then((result) => {
                  const z = '';
                });
                const job = new TsWorkerJob(this.getChannelData, [data, sampleDur.samples, this.format.bitsPerSample]);
                this.addJobToWorker(sampleStart.samples, sampleDur.samples, job);
              });
          } else {
            // decode chunked
            this.format.extractDataFromArray(sampleStart.samples, sampleDur.samples, this.uint8Array!, 0).then((result) => {
              const job = new TsWorkerJob(this.getChannelData, [result, sampleDur.samples, this.format.bitsPerSample]);
              this.addJobToWorker(sampleStart.samples, sampleDur.samples, job);
            }).catch((error) => {
              console.error(error);
            });

            if (sampleStart.samples + sampleDur.samples < this.audioInfo.duration.samples) {
              if (!this.stopDecoding) {
                this.subscrmanager.add(timer(10).subscribe(() => {
                  let sampleDur2 = Math.min(sampleDur.samples,
                    this.audioInfo.duration.samples - sampleStart.samples - sampleDur.samples);

                  if (this.audioInfo.duration.samples - sampleStart.samples - sampleDur.samples < 2 * sampleDur.samples) {
                    sampleDur2 = this.audioInfo.duration.samples - sampleStart.samples - sampleDur.samples;
                  }
                  const durationUnit = new SampleUnit(sampleDur2, this.audioInfo.sampleRate);
                  this.getChunkedChannelData(sampleStart.add(sampleDur), durationUnit).catch((error) => {
                    console.error(error);
                  });
                }));
              } else {
                this.onChannelDataCalculate.complete();
              }
              this.stopDecoding = false;
            }
          }

        } else {
          reject(`can not decode part because samples are not correct`);
        }
      } else {
        this.onChannelDataCalculate.error(new Error('Unsopported audio file format'));
        reject(new Error('Unsopported audio file format'));
      }
    });
  }

  public destroy() {
    this.subscrmanager.destroy();
    this.uint8Array = undefined;
    for (let i = 0; i < this.parallelJobs; i++) {
      this.tsWorkers[i].destroy();
    }
  }

  public minimizeChannelData(args: [any, number]): Promise<Float32Array> {
    return new Promise<Float32Array>((resolve) => {
      const channelData = args[0];
      const factor = args[1];
      if (factor !== 1) {
        const result = new Float32Array(Math.round(channelData.length / factor));

        let counter = 0;
        for (let i = 0; i < channelData.length; i++) {

          let sum = 0;
          for (let j = 0; j < factor; j++) {
            sum += channelData[i + j];
          }

          result[counter] = sum / factor;
          i += factor - 1;
          counter++;
        }
        resolve(result);
      } else {
        resolve(channelData);
      }
    });
  }

  public createOriginalSample(sample: number): SampleUnit {
    return new SampleUnit(sample, this.audioInfo.sampleRate);
  }

  public requeststopDecoding() {
    this.stopDecoding = true;
  }

  private insertChannelBuffer(offset: number, channelData: Float32Array) {
    if (offset + channelData.length <= this.channelData!.length) {
      this.channelData!.set(channelData, offset);
      this.channelDataOffset += channelData.length;
    } else {
      console.error(`can't insert channel channelData: ${channelData.length}, buffer: ${(offset + channelData.length) - this.channelData!.length}`);
    }
  }

  private getChannelData = (args: any[]) => {
    return new Promise<Float32Array>((resolve) => {
      const data: IntArray = args[0];
      const sampleDuration: number = args[1];
      const bitsPerSample: number = args[2];

      const duration = sampleDuration;
      const result = new Float32Array(duration);
      const maxNum = Math.pow(2, bitsPerSample) / 2;
      const unsigned = bitsPerSample === 8;

      let sign = (unsigned) ? -1 : 1;

      for (let i = 0; i < duration; i++) {
        let entry = data[i];

        if (isNaN(entry)) {
          console.error(`entry is NaN at ${i}`);
          break;
        }
        if (unsigned) {
          entry = entry / 2
        }

        result[i] = entry / maxNum * sign;
        const t = result[i];
        if (result[i] > 1) {
          console.error(`entry greater than 1: ${result[i]} at ${i}`);
          break;
        }
        if (unsigned) {
          sign = sign * -1;
        }
      }
      resolve(result);
    });
  }

  private addJobToWorker(start: number, duration: number, job: TsWorkerJob) {
    this.tsWorkers[this.nextWorker].addJob(job);
    this.joblist.push({
      jobId: job.id,
      start,
      duration
    });
    this.nextWorker = (this.nextWorker + 1) % this.parallelJobs;
  }
}

export interface SegmentToDecode {
  number: number;
  sampleStart: SampleUnit;
  sampleDur: SampleUnit;
}
