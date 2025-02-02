import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {AudioService, SettingsService, TranscriptionService, UserInteractionsService} from '../../shared/service';
import {AppInfo} from '../../../app.info';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {HttpClient} from '@angular/common/http';
import {Subscription, timer} from 'rxjs';
import {fadeInExpandOnEnterAnimation, fadeOutCollapseOnLeaveAnimation} from 'angular-animations';
import {NamingDragAndDropComponent} from '../../tools/naming-drag-and-drop/naming-drag-and-drop.component';
import {TableConfiguratorComponent} from '../../tools/table-configurator/table-configurator.component';
import {SubscriptionManager} from '@octra/utilities';
import {NavbarService} from '../../component/navbar/navbar.service';
import {AppStorageService} from '../../shared/service/appstorage.service';
import {Converter, IFile} from '@octra/annotation';
import {OctraModal} from '../types';
import {MDBModalRef, MDBModalService} from 'angular-bootstrap-md';

@Component({
  selector: 'octra-export-files-modal',
  templateUrl: './export-files-modal.component.html',
  styleUrls: ['./export-files-modal.component.scss'],
  animations: [
    fadeInExpandOnEnterAnimation(),
    fadeOutCollapseOnLeaveAnimation()
  ]
})
export class ExportFilesModalComponent extends OctraModal implements OnInit, OnDestroy {
  AppInfo = AppInfo;
  public exportStates = [];
  public preparing = {
    name: '',
    preparing: false
  };
  public parentformat: {
    download: string,
    uri: SafeUrl
  } = {
    download: '',
    uri: ''
  };
  public converters = AppInfo.converters;

  public tools = {
    audioCutting: {
      opened: false,
      selectedMethod: 'client',
      progress: 0,
      result: {
        url: undefined,
        filename: ''
      },
      status: 'idle',
      message: '',
      progressbarType: 'info',
      showConfigurator: false,
      subscriptionIDs: [-1, -1, -1],
      exportFormats: [
        {
          label: 'TextTable',
          value: 'textTable',
          selected: true
        },
        {
          label: 'JSON',
          value: 'json',
          selected: true
        }
      ],
      clientStreamHelper: undefined,
      zippingSpeed: -1,
      cuttingSpeed: -1,
      cuttingTimeLeft: 0,
      timeLeft: 0,
      wavFormat: undefined
    },
    tableConfigurator: {
      opened: false,
      numberOfColumns: 3,
      columns: [],
      result: {
        url: undefined,
        filename: ''
      }
    }
  };

  @ViewChild('namingConvention', {static: false}) namingConvention: NamingDragAndDropComponent;
  @ViewChild('tableConfigurator', {static: false}) tableConfigurator: TableConfiguratorComponent;

  transcriptionService: TranscriptionService;
  navbarService: NavbarService;
  uiService: UserInteractionsService;

  private subscriptionManager = new SubscriptionManager<Subscription>();
  public selectedLevel = 0;

  constructor(private sanitizer: DomSanitizer,
              private httpClient: HttpClient,
              private appStorage: AppStorageService,
              private audio: AudioService,
              private settService: SettingsService,
              modalRef: MDBModalRef,
              modalService: MDBModalService) {
    super('ExportFilesModalComponent');
    this.init(modalService, modalRef);
  }

  ngOnInit() {
    for (const converter of AppInfo.converters) {
      this.exportStates.push('inactive');
    }
  }

  public override close() {
    this.uiService.addElementFromEvent('export', {
      value: 'closed'
    }, Date.now(), this.audio.audiomanagers[0].playposition, -1, undefined, undefined, 'modals');

    return super.close();
  }

  onLineClick(converter: Converter, index: number) {
    if (converter.multitiers || (!converter.multitiers && this.transcriptionService.annotation.levels.length === 1)) {
      this.updateParentFormat(converter);
    }
    this.toggleLine(index);
  }

  sanitize(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  toggleLine(index: number) {
    for (let i = 0; i < this.exportStates.length; i++) {
      if (this.exportStates[i] === 'active') {
        this.exportStates[i] = 'close';
      }
    }

    if (index < this.exportStates.length) {
      if (this.exportStates[index] === 'active') {
        this.exportStates[index] = 'inactive';
      } else {
        this.exportStates[index] = 'active';
      }
    }
  }

  private setParentFormatURI(url: string) {
    if (this.parentformat.uri !== undefined) {
      window.URL.revokeObjectURL(this.parentformat.uri['changingThisBreaksApplicationSecurity']);
    }
    this.parentformat.uri = this.sanitize(url);
  }

  onSelectionChange(converter: Converter, value: any) {
    if (value !== '') {
      this.updateParentFormat(converter, value);
    }
  }

  updateParentFormat(converter: Converter, levelnum?: number) {
    if (levelnum === undefined && !converter.multitiers) {
      levelnum = 0;
    }

    if (!this.preparing.preparing) {
      if (this.transcriptionService.annotation === undefined) {
        console.error(`annotation is undefined!`);
        return;
      }
      const oannotjson = this.transcriptionService.annotation.getObj(this.transcriptionService.audioManager.ressource.info.duration);
      this.preparing = {
        name: converter.name,
        preparing: true
      };
      this.subscriptionManager.add(timer(300).subscribe(
        () => {
          if (converter.name === 'Bundle') {
            // only this converter needs an array buffer
            this.transcriptionService.audiofile.arraybuffer = this.transcriptionService.audioManager.ressource.arraybuffer;
          }

          const result: IFile = converter.export(oannotjson, this.transcriptionService.audiofile, levelnum).file;

          this.parentformat.download = result.name;

          if (this.parentformat.uri !== undefined) {
            window.URL.revokeObjectURL(this.parentformat.uri.toString());
          }
          const test = new File([result.content], result.name);
          this.setParentFormatURI(window.URL.createObjectURL(test));
          this.preparing = {
            name: converter.name,
            preparing: false
          };
        }
      ));
    }
  }

  getProtocol() {
    if (!(this.transcriptionService === undefined)) {
      this.preparing = {
        name: 'Protocol',
        preparing: true
      };
      this.parentformat.download = this.transcriptionService.audiofile.name + '.json';

      if (this.parentformat.uri !== undefined) {
        window.URL.revokeObjectURL(this.parentformat.uri.toString());
      }
      const json = new File([JSON.stringify(this.transcriptionService.extractUI(this.uiService.elements), undefined, 2)], this.parentformat.download);
      this.setParentFormatURI(window.URL.createObjectURL(json));
      this.preparing = {
        name: 'Protocol',
        preparing: false
      };
    } else {
      console.error('can\'t get protocol file');
    }
  }

  onDownloadClick(i: number) {
    this.subscriptionManager.add(timer(500).subscribe(() => {
      this.exportStates[i] = 'inactive';
    }));
  }

  ngOnDestroy() {
    this.subscriptionManager.destroy();
  }

  onHidden() {
    for (let i = 0; i < this.exportStates.length; i++) {
      this.exportStates[i] = 'inactive';
    }

    this.tools.audioCutting.status = 'idle';
    this.tools.audioCutting.progressbarType = 'idle';
    this.tools.audioCutting.progressbarType = 'idle';
    this.tools.audioCutting.progress = 0;
    this.tools.audioCutting.result.filename = '';
    this.tools.audioCutting.result.url = undefined;
    this.tools.audioCutting.opened = false;
    this.tools.audioCutting.subscriptionIDs = [-1, -1];
    this.subscriptionManager.destroy();

    if (this.tools.audioCutting.result.url !== undefined) {
      window.URL.revokeObjectURL(this.tools.audioCutting.result.url);
    }

    if (this.parentformat.uri !== undefined) {
      const url = this.parentformat.uri.toString();
      window.URL.revokeObjectURL(url);
    }
  }

  onPlaintextTimestampOptionChanged(converter: Converter) {
    this.updateParentFormat(converter, this.selectedLevel);
  }
}
