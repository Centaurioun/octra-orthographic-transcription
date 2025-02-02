import {Converter, ExportResult, IFile, ImportResult} from './Converter';
import {OAnnotJSON, OAudiofile, OLabel, OLevel, OSegment} from '../annotjson';

export class SRTConverter extends Converter {

  public constructor() {
    super();
    this._application = 'Video';
    this._name = 'SRT Subtitles';
    this._extension = '.srt';
    this._website.title = 'SRT Subtitles';
    this._website.url = 'https://matroska.org/technical/specs/subtitles/srt.html';
    this._conversion.export = true;
    this._conversion.import = true;
    this._encoding = 'UTF-8';
    this._multitiers = false;
  }

  public static getSamplesFromTimeString(timeString: string, sampleRate: number) {
    if (sampleRate > 0) {
      const regex = new RegExp(/([0-9]+):([0-9]+):([0-9]+),([0-9]+)/g);

      const matches = regex.exec(timeString);

      if (matches.length > -1) {
        const hours = Number(matches[1]);
        const minutes = Number(matches[2]);
        const seconds = Number(matches[3]);
        const miliseconds = Number(matches[4]);

        let totalMiliSeconds = hours * 60 * 60;
        totalMiliSeconds += minutes * 60;
        totalMiliSeconds += seconds;
        totalMiliSeconds *= 1000;
        totalMiliSeconds += miliseconds;
        totalMiliSeconds = Math.round(totalMiliSeconds);

        return Math.round(totalMiliSeconds / 1000 * sampleRate);
      } else {
        console.error(`time string does not match`);
      }
    } else {
      console.error(`invalid sample rate`);
    }
    return -1;
  }

  public export(annotation: OAnnotJSON, audiofile: OAudiofile, levelnum: number): ExportResult {
    if (annotation) {
      let result = '';
      let filename = '';

      if (levelnum === undefined || levelnum < 0 || levelnum > annotation.levels.length) {

        console.error('SRTConverter needs a level number');
        return undefined;
      }

      if (levelnum < annotation.levels.length) {
        const level: OLevel = annotation.levels[levelnum];

        let counter = 1;
        if (level.type === 'SEGMENT') {
          for (const item of level.items) {
            const transcript = item.labels[0].value;
            const start = this.getTimeStringFromSamples(item.sampleStart, annotation.sampleRate);
            const end = this.getTimeStringFromSamples(item.sampleStart + item.sampleDur, annotation.sampleRate);

            if (transcript !== '') {
              result += `${counter}\n`;
              result += `${start} --> ${end}\n`;
              result += `${transcript}\n\n`;
              counter++;
            }
          }
        }

        filename = `${annotation.name}`;
        if (annotation.levels.length > 1) {
          filename += `-${level.name}`;
        }
        filename += `${this._extension}`;
      }

      return {
        file: {
          name: filename,
          content: result,
          encoding: 'UTF-8',
          type: 'text/plain'
        }
      };
    }
    console.error(`annotation file is undefined`);
    return undefined;
  }

  public import(file: IFile, audiofile: OAudiofile): ImportResult {
    if (audiofile) {
      const result = new OAnnotJSON(audiofile.name, audiofile.sampleRate);

      const content = file.content;
      const olevel = new OLevel('OCTRA_1', 'SEGMENT');

      let counterID = 1;
      let lastEnd = 0;

      if (content !== '') {
        const regex = new RegExp('([0-9]+)\n([0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3}) --> ([0-9]{2}:[0-9]{2}:[0-9]{2},[0-9]{3})\n' +
          '((?:(?:(?![0-9]).+)?\n?)+)', 'g');

        let matches = regex.exec(content);
        while (matches !== undefined) {
          const timeStart = SRTConverter.getSamplesFromTimeString(matches[2], audiofile.sampleRate);
          const timeEnd = SRTConverter.getSamplesFromTimeString(matches[3], audiofile.sampleRate);
          const segmentContent = matches[4].replace(/(\n|\s)+$/g, '');

          if (timeStart > -1 && timeEnd > -1) {
            if (timeStart > lastEnd) {
              // add additional segment
              olevel.items.push(new OSegment(
                counterID++, lastEnd, timeStart - lastEnd, [new OLabel('OCTRA_1', '')]
              ));
            }

            olevel.items.push(new OSegment(
              counterID++, timeStart, timeEnd - timeStart, [new OLabel('OCTRA_1', segmentContent)]
            ));
          }
          matches = regex.exec(content);
          lastEnd = timeEnd;
        }
      }

      if (olevel.items.length > 0) {
        // set last segment duration to fit last sample
        const lastItem = olevel.items[olevel.items.length - 1];
        olevel.items[olevel.items.length - 1].sampleDur = Number(audiofile.duration) - Number(lastItem.sampleStart);
      }

      result.levels.push(olevel);
      return {
        annotjson: result,
        audiofile: undefined,
        error: ''
      };
    }

    return {
      annotjson: undefined,
      audiofile: undefined,
      error: `This SRT file is not compatible with this audio file.`
    };
  }

  public getTimeStringFromSamples(samples: number, sampleRate: number) {
    const miliseconds = Math.round(samples / sampleRate * 1000);
    const seconds = Math.floor(miliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const miliStr = this.formatNumber(miliseconds % 1000, 3);
    const secondsStr = this.formatNumber(seconds % 60, 2);
    const minutesStr = this.formatNumber(minutes % 60, 2);
    const hoursStr = this.formatNumber(hours, 2);

    return `${hoursStr}:${minutesStr}:${secondsStr},${miliStr}`;
  }

  public formatNumber = (num, length): string => {
    let result = '' + num.toFixed(0);
    while (result.length < length) {
      result = '0' + result;
    }
    return result;
  }
}
