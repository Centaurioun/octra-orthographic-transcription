import {AfterViewInit, Component, EventEmitter, OnChanges, OnDestroy, OnInit, ViewChild} from '@angular/core';

import {
  AppStorageService,
  AudioService,
  KeymappingService,
  SettingsService,
  TranscriptionService,
  UserInteractionsService
} from '../../core/shared/service';
import {SubscriptionManager} from '../../core/shared';
import {Segment} from '../../core/obj/Annotation';
import {AudioNavigationComponent} from '../../media-components/components/audio/audio-navigation';
import {TranscrEditorComponent} from '../../core/component/transcr-editor';
import {OCTRAEditor} from '../octra-editor';
import {AudioplayerComponent} from '../../media-components/components/audio/audioplayer/audioplayer.component';
import {AudioChunk, AudioManager} from '../../media-components/obj/audio/AudioManager';
import {SampleUnit} from '../../media-components/obj/audio';

@Component({
  selector: 'app-audioplayer-gui',
  templateUrl: './dictaphone-editor.component.html',
  styleUrls: ['./dictaphone-editor.component.css']
})
export class DictaphoneEditorComponent extends OCTRAEditor implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  public static editorname = 'Dictaphone Editor';

  public static initialized: EventEmitter<void> = new EventEmitter<void>();

  @ViewChild('nav', {static: true}) nav: AudioNavigationComponent;
  @ViewChild('audioplayer', {static: true}) audioplayer: AudioplayerComponent;
  @ViewChild('transcr', {static: true}) public editor: TranscrEditorComponent;

  public audiochunk: AudioChunk;
  public audioManager: AudioManager;
  private subscrmanager: SubscriptionManager;
  private shortcuts: any;
  private boundaryselected = false;

  private oldRaw = '';

  public get settings() {
    return this.audioplayer.settings;
  }

  public set settings(value: any) {
    this.audioplayer.settings = value;
  }

  public get app_settings(): any {
    return this.settingsService.appSettings;
  }

  public get projectsettings(): any {
    return this.settingsService.projectsettings;
  }

  constructor(public audio: AudioService,
              public keyMap: KeymappingService,
              public transcrService: TranscriptionService,
              private uiService: UserInteractionsService,
              public settingsService: SettingsService,
              public appStorage: AppStorageService) {
    super();
    this.subscrmanager = new SubscriptionManager();

    if (this.appStorage.usemode === 'online' || this.appStorage.usemode === 'demo') {
      this.subscrmanager.add(this.keyMap.beforeKeyDown.subscribe((event) => {
        if (event.comboKey === 'ALT + SHIFT + 1' ||
          event.comboKey === 'ALT + SHIFT + 2' ||
          event.comboKey === 'ALT + SHIFT + 3') {
          this.transcrService.tasksBeforeSend.push(new Promise<void>((resolve) => {
            this.appStorage.afterSaving().then(() => {
              resolve();
            });
          }));
        }
      }));
    }
  }

  ngOnInit() {
    this.audioManager = this.audio.audiomanagers[0];
    this.audiochunk = this.audioManager.mainchunk.clone();
    // this.audiochunk.speed = 1;
    this.audiochunk.volume = 1;
    // TODO important set shortcuts for keymapping service
    // this.shortcuts = this.settings.shortcuts;
    this.editor.Settings.markers = this.transcrService.guidelines.markers.items;
    this.editor.Settings.responsive = this.settingsService.responsive.enabled;
    this.editor.Settings.special_markers.boundary = true;

    DictaphoneEditorComponent.initialized.emit();
  }

  ngAfterViewInit() {
    this.loadEditor();
  }

  ngOnDestroy() {
    this.subscrmanager.destroy();
  }

  ngOnChanges(obj: any) {
  }

  onButtonClick(event: { type: string, timestamp: number }) {
    this.uiService.addElementFromEvent('mouseclick', {value: event.type},
      event.timestamp, this.audioManager.playposition,
      this.editor.caretpos, null, null, 'audio_buttons');

    switch (event.type) {
      case('play'):
        break;
      case('pause'):
        break;
      case('stop'):
        break;
      case('replay'):
        break;
      case('backward'):
        break;
      case('backward time'):
        break;
      case('default'):
        break;
    }
  }

  afterSpeedChange(event: { new_value: number, timestamp: number }) {
    this.appStorage.audioSpeed = event.new_value;
    this.uiService.addElementFromEvent('slider', event, event.timestamp, this.audioManager.playposition,
      this.editor.caretpos, null, null, 'audio_speed');
  }

  afterVolumeChange(event: { new_value: number, timestamp: number }) {
    this.appStorage.audioVolume = event.new_value;
    this.uiService.addElementFromEvent('slider', event, event.timestamp,
      this.audioManager.playposition, this.editor.caretpos, null, null, 'audio_volume');
  }

  afterTyping(status) {
    if (status === 'started') {
      this.oldRaw = this.editor.rawText;
    }

    if (status === 'stopped') {
      if (this.oldRaw === this.editor.rawText) {
        this.appStorage.savingNeeded = false;
        this.oldRaw = this.editor.rawText;
      }

      this.saveTranscript();
      this.highlight();

      if (this.oldRaw === this.editor.rawText) {
        this.appStorage.saving.emit('success');
      }
    }
  }

  onShortcutTriggered(event) {
    event.value = `audio:${event.value}`;
    this.uiService.addElementFromEvent('shortcut', event, Date.now(),
      this.audioManager.playposition, this.editor.caretpos, null, null, 'texteditor');
  }

  onBoundaryClicked(samples: SampleUnit) {
    const i: number = this.transcrService.currentlevel.segments.getSegmentBySamplePosition(samples);

    this.boundaryselected = true;

    if (i > -1) {
      const start = (i > 0) ? this.transcrService.currentlevel.segments.get(i - 1).time.samples : 0;

      new Promise<void>((resolve) => {
        if (this.audiochunk.isPlaying) {
          this.audiochunk.stopPlayback().then(resolve);
        } else {
          resolve();
        }
      }).then(() => {
        this.audiochunk.startpos = this.audioManager.createSampleUnit(start);
        this.audiochunk.selection.end = this.transcrService.currentlevel.segments.get(i).time.clone();
        // this.audioplayer.update();

        this.audiochunk.startPlayback().then(() => {
          // set start pos and playback length to end of audio file
          this.audiochunk.startpos = this.audioManager.createSampleUnit(samples.samples);
          // this.audioplayer.update();
        });
        this.boundaryselected = false;
      });
    } else {
      this.boundaryselected = false;
    }
  }

  onBoundaryInserted() {
    this.uiService.addElementFromEvent('segment', {value: 'boundaries:add'}, Date.now(),
      this.audioManager.playposition, this.editor.caretpos, null, null, 'texteditor');
  }

  onMarkerInsert(markerCode: string) {
    this.uiService.addElementFromEvent('shortcut', {value: 'markers:' + markerCode}, Date.now(),
      this.audioManager.playposition, this.editor.caretpos, null, null, 'texteditor');
  }

  onMarkerClick(markerCode: string) {
    this.afterTyping('stopped');

    this.uiService.addElementFromEvent('mouseclick', {value: markerCode}, Date.now(),
      this.audioManager.playposition, this.editor.caretpos, null, null, 'texteditor_toolbar');
  }

  saveTranscript() {
    console.log(`save transcript!`);
    let rawText = this.editor.rawText;
    // split text at the position of every boundary marker
    let segTexts: string[] = rawText.split(
      /\s*{[0-9]+}\s*/g);

    const samplesArray: number[] = [];
    rawText.replace(new RegExp('\s*{([0-9]+)}\s*', 'g'),
      (match, g1) => {
        samplesArray.push(Number(g1));
        return '';
      });

    // remove invalid boundaries
    if (segTexts.length > 1) {
      let start = 0;
      for (let i = 0; i < samplesArray.length; i++) {
        if (!(samplesArray[i] > start)) {
          // remove boundary
          samplesArray.splice(i, 1);

          // concat
          segTexts[i + 1] = segTexts[i] + segTexts[i + 1];
          segTexts.splice(i, 1);


          --i;
        } else {
          start = samplesArray[i];
        }
      }
    }

    segTexts = segTexts.map((a: string) => {
      return a.replace(/(^\s+)|(\s+$)/g, '');
    });

    let annoSegLength = this.transcrService.currentlevel.segments.length;
    for (let i = 0; i < segTexts.length; i++) {
      const newRaw = segTexts[i];

      if (i < annoSegLength) {
        // probably overwrite old files
        const segment: Segment = this.transcrService.currentlevel.segments.get(i).clone();
        segment.transcript = newRaw;
        if (i < segTexts.length - 1) {
          segment.time = this.audioManager.createSampleUnit(samplesArray[i]);
        }

        this.transcrService.currentlevel.segments.change(i, segment);
      } else {
        // add new segments
        if (i === segTexts.length - 1) {
          this.transcrService.currentlevel.segments.add(this.audiochunk.time.end.clone(), newRaw);
        } else {
          this.transcrService.currentlevel.segments.add(this.audioManager.createSampleUnit(samplesArray[i]), newRaw);
        }
      }
    }

    annoSegLength = this.transcrService.currentlevel.segments.length;
    if (annoSegLength > segTexts.length) {
      // remove left segments
      this.transcrService.currentlevel.segments.segments.splice(segTexts.length, (annoSegLength - segTexts.length));
      // because last segment was removed
      const seg = this.transcrService.currentlevel.segments.get(segTexts.length - 1);
      seg.time = this.audiochunk.time.end.clone();
    }
  }

  public highlight() {
    /*
    const html: string = this.editor.html.replace(/&nbsp;/g, ' ');

    const samplesArray: number[] = [];
    html.replace(/\s?<img src="assets\/img\/components\/transcr-editor\/boundary.png"[\s\w="-:;äüößÄÜÖ]*data-samples="([0-9]+)" alt="\[\|[0-9]+\|]">\s?/g,
      (match, g1, g2) => {
        samplesArray.push(Number(g1));
        return '';
      });

    let start = 0;
    for (let i = 0; i < samplesArray.length; i++) {
      if (!(samplesArray[i] > start)) {
        // mark boundary red
        jQuery('.note-editable.panel-body img[data-samples]:eq(' + i + ')').css({
          'background-color': 'red'
        });
      } else {
        jQuery('.note-editable.panel-body img[data-samples]:eq(' + i + ')').css({
          'background-color': 'white'
        });
        start = samplesArray[i];
      }
    }*/
  }

  public update() {
    this.audiochunk.startpos = this.audiochunk.time.start;
    // this.audioplayer.update();
    this.loadEditor();
  }

  public onSelectionChanged(caretpos) {
    /*
    if (!this.audiochunk.isPlaying) {
      const seg_num = this.editor.getSegmentByCaretPos(caretpos);
      if (seg_num > -1) {
        const samples = (seg_num > 0) ? this.transcrService.currentlevel.segments.get(seg_num - 1).time.samples : 0;
        this.audiochunk.startpos = new AudioTime(samples, this.audiochunk.audioManager.ressource.info.sampleRate);
        this.audiochunk.selection.end = this.transcrService.currentlevel.segments.get(seg_num).time.clone();
        this.audioplayer.update();
      }
    } */
  }

  private loadEditor() {
    if (this.transcrService.currentlevel.segments.length > 0) {
      this.editor.segments = this.transcrService.currentlevel.segments;
    }
    this.editor.Settings.height = 100;
    this.editor.update();
    this.oldRaw = this.editor.rawText;
  }

  public afterFirstInitialization() {
    // ignore
  }

  onKeyUp() {
    this.appStorage.savingNeeded = true;
  }
}
