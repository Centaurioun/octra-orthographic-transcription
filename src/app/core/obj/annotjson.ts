import {isNullOrUndefined} from 'util';

export interface IAnnotJSON {
  name: string;
  annotates: string;
  sampleRate: number;
  levels: ILevel[];
}

export interface ILevel {
  name: string;
  type: string;
  items: ISegment[];
}

export interface IItem {
  id: number;
  labels: ILabel[];
}

export interface ISegment extends IItem {
  sampleStart: number;
  sampleDur: number;
}

export interface ILabel {
  name: string;
  value: string;
}

export interface ILink {
  fromID: number;
  toID: number;
}

export interface IAudioFile {
  name: string;
  size: number;
  duration: number;
  samplerate: number;
  /*channels: number;
   bit_rate: number;*/
}

/*
 CLASSES
 Classes that are just container to build their interfaces
 */

export class OAnnotJSON implements IAnnotJSON {
  name = '';
  annotates = '';
  sampleRate;
  levels: OLevel[] = [];
  links: OLink[] = [];

  constructor(audio_file: string, samplerate: number, levels?: ILevel[], links?: ILink[]) {
    this.annotates = audio_file;
    this.name = audio_file;
    this.sampleRate = samplerate;

    if (audio_file.lastIndexOf('.') > -1) {
      this.name = audio_file.substr(0, audio_file.lastIndexOf('.'));
    }

    if (!isNullOrUndefined(levels)) {
      this.levels = levels;
    }

    if (!isNullOrUndefined(links)) {
      this.links = links;
    }
  }
}

export class OAudiofile implements IAudioFile {
  name: string;
  // need type attribute
  size: number;
  duration: number;
  samplerate: number;

  constructor() {
  }
}

export class OLevel implements ILevel {
  name = '';
  type = '';
  items: ISegment[];

  constructor(name: string, type: string, items?: ISegment[]) {
    this.name = name;
    this.type = type;
    this.items = [];

    if (!isNullOrUndefined(items)) {
      this.items = items;
    }
  }
}

export class OItem implements IItem {
  id = 0;
  labels: OLabel[];

  constructor(id: number, labels?: ILabel[]) {
    this.id = id;

    this.labels = [];
    if (!isNullOrUndefined(labels)) {
      this.labels = labels;
    }
  }
}

export class OSegment extends OItem {
  sampleStart = 0;
  sampleDur = 0;

  constructor(id: number, sampleStart: number, sampleDur: number, labels?: ILabel[]) {
    super(id, labels);
    this.sampleStart = sampleStart;
    this.sampleDur = sampleDur;
  }
}

export class OLabel implements ILabel {
  name = '';
  value = '';

  constructor(name: string, value: string) {
    this.name = name;
    this.value = value;
  }
}

export class OLink implements ILink {
  fromID: number;
  toID: number;

  constructor(fromID: number, toID: number) {
    this.fromID = fromID;
    this.toID = toID;
  }
}

export enum AnnotJSONType {
  ITEM,
  EVENT,
  SEGMENT
}

